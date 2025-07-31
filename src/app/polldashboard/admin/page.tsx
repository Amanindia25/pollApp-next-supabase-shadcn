'use client';

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";

import { toast } from "sonner";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  deadline: string | null;
  created_at: string;
  created_by: string;
  description_file_url?: string | null;
  description_image_url?: string | null;
  description_text?: string | null; 
}

const extractTextFromFile = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error('No file provided for text extraction');
  }

  if (file.type === 'application/pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        }).join(' ') + '\n';
      }
      
      return text.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
    }
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract text from document: ${errorMessage}`);
    }
  }
  
  throw new Error('Unsupported file type for text extraction. Only PDF and Word documents are supported.');
};

const ManagePollsPage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState("");
  const [newPollDeadline, setNewPollDeadline] = useState<Date | null>(null);
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["", ""]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // New state for selected file
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null); // New state for file preview

  const supabase = createClient();

  useEffect(() => {
    const checkAdminAndFetchPolls = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.log("User not logged in, cannot fetch admin status.");
          setError("User not logged in.");
          setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (profile?.role !== "admin") {
          setError("Access Denied: You are not an administrator.");
          setLoading(false);
          return;
        }
        setIsAdmin(true);

        // Fetch polls
        const { data: pollsData, error: pollsError } = await supabase
          .from("polls")
          .select("*");

        if (pollsError) throw pollsError;

        setPolls(pollsData || []);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";

        setError("Failed to fetch data: " + errorMessage);
        toast.error("Failed to fetch data: " + errorMessage);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetchPolls();

    // Cleanup function
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [supabase]);

  const handleAddOption = () => {
    setNewPollOptions([...newPollOptions, ""]);
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = newPollOptions.filter((_, i) => i !== index);
    setNewPollOptions(updatedOptions);
  };

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newPollOptions];
    updatedOptions[index] = value;
    setNewPollOptions(updatedOptions);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file size
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File size exceeds 10MB limit.');
        event.target.value = '';
        return;
      }

      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
      
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        toast.error('Unsupported file type. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX');
        event.target.value = '';
        return;
      }

      setSelectedFile(file);

      // Create a preview URL for images
      if (file.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null); // Clear preview for non-image files
      }
    } else {
      setSelectedFile(null);
      setFilePreviewUrl(null);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit.');
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new Error('Unsupported file type. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX');
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const bucketName = file.type.startsWith('image/') ? 'poll_images' : 'poll_documents';

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File upload failed';
      throw new Error(`Upload failed: ${errorMessage}`);
    }
  };

  const handleCreatePoll = async () => {
    if (!newPollTitle || newPollOptions.some((option) => !option.trim())) {
      toast.error("Please fill in all required fields (Title and Options).");
      return;
    }

    setLoading(true);
    let description_file_url: string | null = null;
    let description_image_url: string | null = null;
    let description_text: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not logged in.");
        setLoading(false);
        return;
      }

      if (selectedFile) {
        try {
          const uploadedUrl = await uploadFile(selectedFile);
          if (selectedFile.type.startsWith('image/')) {
            description_image_url = uploadedUrl;
          } else {
            description_file_url = uploadedUrl;
            // Extract text from PDF/DOCX files
            description_text = await extractTextFromFile(selectedFile);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast.error(errorMessage);
          return;
        }
      }

      const { error: insertError } = await supabase.from("polls").insert({
        title: newPollTitle,
        options: newPollOptions.map((text) => ({ text, votes: 0 })),
        deadline: newPollDeadline?.toISOString() || null,
        created_by: user.id,
        description_file_url,
        description_image_url,
        description_text, // Add this
      });

      if (insertError) throw insertError;

      toast.success("Poll created successfully!");
      setIsDialogOpen(false);
      setNewPollTitle("");
      setNewPollDeadline(null);
      setNewPollOptions(["", ""]);
      setSelectedFile(null); // Clear selected file
      setFilePreviewUrl(null); // Clear preview
      // Re-fetch polls to update the list
      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select("*");
      if (pollsError) throw pollsError;
      setPolls(pollsData || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to create poll: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPoll(poll);
    setNewPollTitle(poll.title);
    setNewPollOptions(poll.options.map(opt => opt.text));
    setNewPollDeadline(poll.deadline ? new Date(poll.deadline) : null);
    setSelectedFile(null); // Clear selected file when editing
    setFilePreviewUrl(poll.description_image_url || null); // Set preview if image exists
    setIsDialogOpen(true);
  };

  const handleUpdatePoll = async () => {
    if (!editingPoll) return;

    if (!newPollTitle || newPollOptions.some((option) => !option.trim())) {
      toast.error("Please fill in all required fields (Title and Options).");
      return;
    }

    setLoading(true);
    let updatedDescriptionFileUrl: string | null = editingPoll.description_file_url || null;
    let updatedDescriptionImageUrl: string | null = editingPoll.description_image_url || null;
    let updatedDescriptionText: string | null = editingPoll.description_text || null; // Add this

    try {
      if (selectedFile) {
        try {
          // Upload new file
          const uploadedUrl = await uploadFile(selectedFile);
          if (selectedFile.type.startsWith('image/')) {
            updatedDescriptionImageUrl = uploadedUrl;
            updatedDescriptionFileUrl = null;
            updatedDescriptionText = null; // Clear text for images
          } else {
            updatedDescriptionFileUrl = uploadedUrl;
            updatedDescriptionImageUrl = null;
            // Extract text from PDF/DOCX files
            updatedDescriptionText = await extractTextFromFile(selectedFile);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast.error(errorMessage);
          return;
        }
      } else if (filePreviewUrl === null && (editingPoll.description_file_url || editingPoll.description_image_url)) {
        updatedDescriptionFileUrl = null;
        updatedDescriptionImageUrl = null;
        updatedDescriptionText = null; // Clear text when file is removed
      }

      const { error: updateError } = await supabase
        .from("polls")
        .update({
          title: newPollTitle,
          options: newPollOptions.map((text) => {
            const existingOption = editingPoll.options.find(opt => opt.text === text);
            return { text, votes: existingOption ? existingOption.votes : 0 };
          }),
          deadline: newPollDeadline?.toISOString() || null,
          description_file_url: updatedDescriptionFileUrl,
          description_image_url: updatedDescriptionImageUrl,
          description_text: updatedDescriptionText, // Include extracted text
        })
        .eq("id", editingPoll.id);

      if (updateError) throw updateError;

      toast.success("Poll updated successfully!");
      setIsDialogOpen(false);
      setEditingPoll(null);
      setNewPollTitle("");
      setNewPollDeadline(null);
      setNewPollOptions(["", ""]);
      setSelectedFile(null); // Clear selected file
      setFilePreviewUrl(null); // Clear preview
      // Re-fetch polls to update the list
      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select("*");
      if (pollsError) throw pollsError;
      setPolls(pollsData || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to update poll: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!window.confirm("Are you sure you want to delete this poll? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      // Get the poll details first to handle file cleanup
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select("*")
        .eq("id", pollId)
        .single();

      if (pollError) {
        throw pollError;
      }

      // Delete associated files if they exist
      if (pollData.description_image_url) {
        const imageFileName = pollData.description_image_url.split('/').pop();
        if (imageFileName) {
          const { error: imageDeleteError } = await supabase.storage
            .from('poll_images')
            .remove([imageFileName]);
          if (imageDeleteError) {
            console.error('Failed to delete image:', imageDeleteError);
          }
        }
      }

      if (pollData.description_file_url) {
        const fileFileName = pollData.description_file_url.split('/').pop();
        if (fileFileName) {
          const { error: fileDeleteError } = await supabase.storage
            .from('poll_documents')
            .remove([fileFileName]);
          if (fileDeleteError) {
            console.error('Failed to delete document:', fileDeleteError);
          }
        }
      }

      // Delete the poll record
      const { error: deleteError } = await supabase
        .from("polls")
        .delete()
        .eq("id", pollId);

      if (deleteError) {
        throw deleteError;
      }

      toast.success("Poll and associated files deleted successfully!");
      setPolls(polls.filter((poll) => poll.id !== pollId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete poll: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-red-500 text-center">
        Error: {error}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4 text-red-500 text-center">
        Access Denied: You do not have administrative privileges.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Manage Polls</h1>
      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { // Reset form and file states when dialog closes
            setEditingPoll(null);
            setNewPollTitle("");
            setNewPollDeadline(null);
            setNewPollOptions(["", ""]);
            setSelectedFile(null);
            setFilePreviewUrl(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>Create New Poll</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingPoll ? "Edit Poll" : "Create New Poll"}</DialogTitle>
              <DialogDescription>
                {editingPoll ? "Update the details of your existing poll." : "Create a new poll by filling out the form below."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={newPollTitle}
                  onChange={(e) => setNewPollTitle(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deadline" className="text-right">
                  Deadline
                </Label>
                <DatePicker
                  selected={newPollDeadline}
                  onChange={(date: Date | null) => setNewPollDeadline(date)}
                  showTimeSelect
                  dateFormat="Pp"
                  className="col-span-3 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Options</Label>
                <div className="col-span-3 space-y-2">
                  {newPollOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) =>
                          handleOptionChange(index, e.target.value)
                        }
                        placeholder={`Option ${index + 1}`}
                      />
                      {newPollOptions.length > 2 && (
                        <Button
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddOption}>
                    Add Option
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="descriptionFile" className="text-right">
                  Description File/Image
                </Label>
                <Input
                  id="descriptionFile"
                  type="file"
                  className="col-span-3"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,image/*" // Accept PDF, DOC, DOCX, and any image type
                />
              </div>
              {filePreviewUrl && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-1"></div>
                  <div className="col-span-3">
                    {selectedFile?.type.startsWith('image/') ? (
                      <Image src={filePreviewUrl} alt="File Preview" width={500} height={300} className="max-w-full h-auto" style={{ width: 'auto', height: 'auto' }} />
                    ) : (
                      <p>File selected: {selectedFile?.name}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Display existing file/image if editing and no new file selected */}
              {!selectedFile && editingPoll && (editingPoll.description_file_url || editingPoll.description_image_url) && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-1"></div>
                  <div className="col-span-3">
                    {editingPoll.description_image_url ? (
                      <Image src={editingPoll.description_image_url} alt="Existing Image" width={500} height={300} className="max-w-full h-auto" style={{ width: 'auto', height: 'auto' }} />
                    ) : (
                      <p>Existing File: <a href={editingPoll.description_file_url || '#'} target="_blank" rel="noopener noreferrer">View Document</a></p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={editingPoll ? handleUpdatePoll : handleCreatePoll}
                disabled={loading}
              >
                {editingPoll ? "Update Poll" : "Create Poll"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Total Votes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {polls.map((poll) => (
            <TableRow key={poll.id}>
              <TableCell className="font-medium">{poll.title}</TableCell>
              <TableCell>
                {poll.deadline
                  ? new Date(poll.deadline).toLocaleString()
                  : "N/A"}
              </TableCell>
              <TableCell>
                {poll.options.reduce((sum, option) => sum + option.votes, 0)}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditPoll(poll)}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePoll(poll.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ManagePollsPage;
