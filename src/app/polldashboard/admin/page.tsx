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
    <div className="container mx-auto p-4 bg-gray-100 h-screen rounded-[20px]">
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
          <DialogContent className="sm:max-w-[425px] bg-gray-100">
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
                <Label htmlFor="deadline" className="text-right text-black">
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
        <TableBody >
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


























//--------------------------------------------
// 'use client';

// import React, { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import Image from "next/image";
// import { toast } from "sonner";
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';

// interface PollOption {
//   text: string;
//   votes: number;
// }

// interface Poll {
//   id: string;
//   title: string;
//   options: PollOption[];
//   deadline: string | null;
//   created_at: string;
//   created_by: string;
//   description_file_url?: string | null;
//   description_image_url?: string | null;
//   description_text?: string | null; 
// }

// const extractTextFromFile = async (file: File): Promise<string> => {
//   if (!file) {
//     throw new Error('No file provided for text extraction');
//   }

//   if (file.type === 'application/pdf') {
//     try {
//       const pdfjsLib = await import('pdfjs-dist');
//       pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
//       const arrayBuffer = await file.arrayBuffer();
//       const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
//       let text = '';
      
//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         const content = await page.getTextContent();
//         text += content.items.map((item) => {
//           if ('str' in item) {
//             return item.str;
//           }
//           return '';
//         }).join(' ') + '\n';
//       }
      
//       return text.trim();
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
//     }
//   } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
//     try {
//       const mammoth = await import('mammoth');
//       const arrayBuffer = await file.arrayBuffer();
//       const result = await mammoth.extractRawText({ arrayBuffer });
//       return result.value.trim();
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       throw new Error(`Failed to extract text from document: ${errorMessage}`);
//     }
//   }
  
//   throw new Error('Unsupported file type for text extraction. Only PDF and Word documents are supported.');
// };

// const ManagePollsPage = () => {
//   const [polls, setPolls] = useState<Poll[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [newPollTitle, setNewPollTitle] = useState("");
//   const [newPollDeadline, setNewPollDeadline] = useState<Date | null>(null);
//   const [newPollOptions, setNewPollOptions] = useState<string[]>(["", ""]);
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

//   const supabase = createClient();

//   useEffect(() => {
//     const checkAdminAndFetchPolls = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const {
//           data: { user },
//         } = await supabase.auth.getUser();
//         if (!user) {
//           console.log("User not logged in, cannot fetch admin status.");
//           setError("User not logged in.");
//           setLoading(false);
//           return;
//         }

//         const { data: profile, error: profileError } = await supabase
//           .from("profiles")
//           .select("role")
//           .eq("id", user.id)
//           .single();

//         if (profileError) {
//           throw profileError;
//         }

//         if (profile?.role !== "admin") {
//           setError("Access Denied: You are not an administrator.");
//           setLoading(false);
//           return;
//         }
//         setIsAdmin(true);

//         const { data: pollsData, error: pollsError } = await supabase
//           .from("polls")
//           .select("*");

//         if (pollsError) throw pollsError;

//         setPolls(pollsData || []);
//       } catch (err: unknown) {
//         const errorMessage =
//           err instanceof Error ? err.message : "Unknown error";

//         setError("Failed to fetch data: " + errorMessage);
//         toast.error("Failed to fetch data: " + errorMessage);
//       } finally {
//         setLoading(false);
//       }
//     };

//     checkAdminAndFetchPolls();

//     return () => {
//       if (filePreviewUrl) {
//         URL.revokeObjectURL(filePreviewUrl);
//       }
//     };
//   }, [supabase]);

//   const handleAddOption = () => {
//     setNewPollOptions([...newPollOptions, ""]);
//   };

//   const handleRemoveOption = (index: number) => {
//     const updatedOptions = newPollOptions.filter((_, i) => i !== index);
//     setNewPollOptions(updatedOptions);
//   };

//   const handleOptionChange = (index: number, value: string) => {
//     const updatedOptions = [...newPollOptions];
//     updatedOptions[index] = value;
//     setNewPollOptions(updatedOptions);
//   };

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     if (event.target.files && event.target.files[0]) {
//       const file = event.target.files[0];
      
//       const MAX_FILE_SIZE = 10 * 1024 * 1024;
//       if (file.size > MAX_FILE_SIZE) {
//         toast.error('File size exceeds 10MB limit.');
//         event.target.value = '';
//         return;
//       }

//       const fileExtension = file.name.split('.').pop()?.toLowerCase();
//       const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
      
//       if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
//         toast.error('Unsupported file type. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX');
//         event.target.value = '';
//         return;
//       }

//       setSelectedFile(file);

//       if (file.type.startsWith('image/')) {
//         setFilePreviewUrl(URL.createObjectURL(file));
//       } else {
//         setFilePreviewUrl(null);
//       }
//     } else {
//       setSelectedFile(null);
//       setFilePreviewUrl(null);
//     }
//   };

//   const uploadFile = async (file: File): Promise<string> => {
//     const MAX_FILE_SIZE = 10 * 1024 * 1024;
//     if (file.size > MAX_FILE_SIZE) {
//       throw new Error('File size exceeds 10MB limit.');
//     }

//     const fileExtension = file.name.split('.').pop()?.toLowerCase();
//     const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
    
//     if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
//       throw new Error('Unsupported file type. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX');
//     }

//     const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
//     const bucketName = file.type.startsWith('image/') ? 'poll_images' : 'poll_documents';

//     try {
//       const { data, error } = await supabase.storage
//         .from(bucketName)
//         .upload(fileName, file, { 
//           cacheControl: '3600',
//           upsert: false,
//           contentType: file.type
//         });

//       if (error) {
//         throw error;
//       }

//       const { data: publicUrlData } = supabase.storage
//         .from(bucketName)
//         .getPublicUrl(data.path);

//       return publicUrlData.publicUrl;
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'File upload failed';
//       throw new Error(`Upload failed: ${errorMessage}`);
//     }
//   };

//   const handleCreatePoll = async () => {
//     if (!newPollTitle || newPollOptions.some((option) => !option.trim())) {
//       toast.error("Please fill in all required fields (Title and Options).");
//       return;
//     }

//     setLoading(true);
//     let description_file_url: string | null = null;
//     let description_image_url: string | null = null;
//     let description_text: string | null = null;

//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         toast.error("User not logged in.");
//         setLoading(false);
//         return;
//       }

//       if (selectedFile) {
//         try {
//           const uploadedUrl = await uploadFile(selectedFile);
//           if (selectedFile.type.startsWith('image/')) {
//             description_image_url = uploadedUrl;
//           } else {
//             description_file_url = uploadedUrl;
//             description_text = await extractTextFromFile(selectedFile);
//           }
//         } catch (error) {
//           const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//           toast.error(errorMessage);
//           return;
//         }
//       }

//       const { error: insertError } = await supabase.from("polls").insert({
//         title: newPollTitle,
//         options: newPollOptions.map((text) => ({ text, votes: 0 })),
//         deadline: newPollDeadline?.toISOString() || null,
//         created_by: user.id,
//         description_file_url,
//         description_image_url,
//         description_text,
//       });

//       if (insertError) throw insertError;

//       toast.success("Poll created successfully!");
//       setIsDialogOpen(false);
//       setNewPollTitle("");
//       setNewPollDeadline(null);
//       setNewPollOptions(["", ""]);
//       setSelectedFile(null);
//       setFilePreviewUrl(null);
//       const { data: pollsData, error: pollsError } = await supabase
//         .from("polls")
//         .select("*");
//       if (pollsError) throw pollsError;
//       setPolls(pollsData || []);
//     } catch (err: unknown) {
//       const errorMessage = err instanceof Error ? err.message : "Unknown error";
//       toast.error("Failed to create poll: " + errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleEditPoll = (poll: Poll) => {
//     setEditingPoll(poll);
//     setNewPollTitle(poll.title);
//     setNewPollOptions(poll.options.map(opt => opt.text));
//     setNewPollDeadline(poll.deadline ? new Date(poll.deadline) : null);
//     setSelectedFile(null);
//     setFilePreviewUrl(poll.description_image_url || null);
//     setIsDialogOpen(true);
//   };

//   const handleUpdatePoll = async () => {
//     if (!editingPoll) return;

//     if (!newPollTitle || newPollOptions.some((option) => !option.trim())) {
//       toast.error("Please fill in all required fields (Title and Options).");
//       return;
//     }

//     setLoading(true);
//     let updatedDescriptionFileUrl: string | null = editingPoll.description_file_url || null;
//     let updatedDescriptionImageUrl: string | null = editingPoll.description_image_url || null;
//     let updatedDescriptionText: string | null = editingPoll.description_text || null;

//     try {
//       if (selectedFile) {
//         try {
//           const uploadedUrl = await uploadFile(selectedFile);
//           if (selectedFile.type.startsWith('image/')) {
//             updatedDescriptionImageUrl = uploadedUrl;
//             updatedDescriptionFileUrl = null;
//             updatedDescriptionText = null;
//           } else {
//             updatedDescriptionFileUrl = uploadedUrl;
//             updatedDescriptionImageUrl = null;
//             updatedDescriptionText = await extractTextFromFile(selectedFile);
//           }
//         } catch (error) {
//           const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//           toast.error(errorMessage);
//           return;
//         }
//       } else if (filePreviewUrl === null && (editingPoll.description_file_url || editingPoll.description_image_url)) {
//         updatedDescriptionFileUrl = null;
//         updatedDescriptionImageUrl = null;
//         updatedDescriptionText = null;
//       }

//       const { error: updateError } = await supabase
//         .from("polls")
//         .update({
//           title: newPollTitle,
//           options: newPollOptions.map((text) => {
//             const existingOption = editingPoll.options.find(opt => opt.text === text);
//             return { text, votes: existingOption ? existingOption.votes : 0 };
//           }),
//           deadline: newPollDeadline?.toISOString() || null,
//           description_file_url: updatedDescriptionFileUrl,
//           description_image_url: updatedDescriptionImageUrl,
//           description_text: updatedDescriptionText,
//         })
//         .eq("id", editingPoll.id);

//       if (updateError) throw updateError;

//       toast.success("Poll updated successfully!");
//       setIsDialogOpen(false);
//       setEditingPoll(null);
//       setNewPollTitle("");
//       setNewPollDeadline(null);
//       setNewPollOptions(["", ""]);
//       setSelectedFile(null);
//       setFilePreviewUrl(null);
//       const { data: pollsData, error: pollsError } = await supabase
//         .from("polls")
//         .select("*");
//       if (pollsError) throw pollsError;
//       setPolls(pollsData || []);
//     } catch (err: unknown) {
//       const errorMessage = err instanceof Error ? err.message : "Unknown error";
//       toast.error("Failed to update poll: " + errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDeletePoll = async (pollId: string) => {
//     if (!window.confirm("Are you sure you want to delete this poll? This action cannot be undone.")) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const { data: pollData, error: pollError } = await supabase
//         .from("polls")
//         .select("*")
//         .eq("id", pollId)
//         .single();

//       if (pollError) {
//         throw pollError;
//       }

//       if (pollData.description_image_url) {
//         const imageFileName = pollData.description_image_url.split('/').pop();
//         if (imageFileName) {
//           const { error: imageDeleteError } = await supabase.storage
//             .from('poll_images')
//             .remove([imageFileName]);
//           if (imageDeleteError) {
//             console.error('Failed to delete image:', imageDeleteError);
//           }
//         }
//       }

//       if (pollData.description_file_url) {
//         const fileFileName = pollData.description_file_url.split('/').pop();
//         if (fileFileName) {
//           const { error: fileDeleteError } = await supabase.storage
//             .from('poll_documents')
//             .remove([fileFileName]);
//           if (fileDeleteError) {
//             console.error('Failed to delete document:', fileDeleteError);
//           }
//         }
//       }

//       const { error: deleteError } = await supabase
//         .from("polls")
//         .delete()
//         .eq("id", pollId);

//       if (deleteError) {
//         throw deleteError;
//       }

//       toast.success("Poll and associated files deleted successfully!");
//       setPolls(polls.filter((poll) => poll.id !== pollId));
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : "Unknown error";
//       toast.error("Failed to delete poll: " + errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center">
//         <div className="text-gray-600 text-lg animate-pulse">Loading...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center">
//         <div className="text-red-500 text-lg font-medium bg-red-100 p-6 rounded-lg shadow-md">
//           Error: {error}
//         </div>
//       </div>
//     );
//   }

//   if (!isAdmin) {
//     return (
//       <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center">
//         <div className="text-red-500 text-lg font-medium bg-red-100 p-6 rounded-lg shadow-md">
//           Access Denied: You do not have administrative privileges.
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-6 rounded-lg">
//       <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
//         Manage Polls
//       </h1>
//       <div className="flex justify-end mb-6">
//         <Dialog open={isDialogOpen} onOpenChange={(open) => {
//           setIsDialogOpen(open);
//           if (!open) {
//             setEditingPoll(null);
//             setNewPollTitle("");
//             setNewPollDeadline(null);
//             setNewPollOptions(["", ""]);
//             setSelectedFile(null);
//             setFilePreviewUrl(null);
//           }
//         }}>
          
//           <DialogTrigger asChild>
//             <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300">
//               Create New Poll
//             </Button>
//           </DialogTrigger>
//           <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl">
//             <DialogHeader>
//               <DialogTitle className="text-2xl font-bold text-gray-800">
//                 {editingPoll ? "Edit Poll" : "Create New Poll"}
//               </DialogTitle>
//               <DialogDescription className="text-gray-600">
//                 {editingPoll ? "Update the details of your existing poll." : "Create a new poll by filling out the form below."}
//               </DialogDescription>
//             </DialogHeader>
//             <div className="grid gap-6 py-4">
//               <div className="grid grid-cols-4 items-center gap-4">
//                 <Label htmlFor="title" className="text-right font-medium text-gray-700">
//                   Title
//                 </Label>
//                 <Input
//                   id="title"
//                   value={newPollTitle}
//                   onChange={(e) => setNewPollTitle(e.target.value)}
//                   className="col-span-3 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
//                   placeholder="Enter poll title"
//                 />
//               </div>
//               <div className="grid grid-cols-4 items-center gap-4">
//                 <Label htmlFor="deadline" className="text-right font-medium text-gray-700">
//                   Deadline
//                 </Label>
//                 <DatePicker
//                   selected={newPollDeadline}
//                   onChange={(date: Date | null) => setNewPollDeadline(date)}
//                   showTimeSelect
//                   dateFormat="Pp"
//                   className="col-span-3 w-full border border-gray-300 bg-white px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//               <div className="grid grid-cols-4 items-start gap-4">
//                 <Label className="text-right font-medium text-gray-700 pt-2">
//                   Options
//                 </Label>
//                 <div className="col-span-3 space-y-3">
//                   {newPollOptions.map((option, index) => (
//                     <div key={index} className="flex items-center space-x-2">
//                       <Input
//                         value={option}
//                         onChange={(e) => handleOptionChange(index, e.target.value)}
//                         placeholder={`Option ${index + 1}`}
//                         className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
//                       />
//                       {newPollOptions.length > 2 && (
//                         <Button
//                           variant="destructive"
//                           size="sm"
//                           onClick={() => handleRemoveOption(index)}
//                           className="bg-red-500 hover:bg-red-600 text-white rounded-lg"
//                         >
//                           Remove
//                         </Button>
//                       )}
//                     </div>
//                   ))}
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={handleAddOption}
//                     className="border-blue-500 text-blue-500 hover:bg-blue-50 rounded-lg"
//                   >
//                     Add Option
//                   </Button>
//                 </div>
//               </div>
//               <div className="grid grid-cols-4 items-center gap-4">
//                 <Label htmlFor="descriptionFile" className="text-right font-medium text-gray-700">
//                   File/Image
//                 </Label>
//                 <div className="col-span-3">
//                   <Input
//                     id="descriptionFile"
//                     type="file"
//                     className="border-gray-300 bg-white rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:hover:bg-blue-600"
//                     onChange={handleFileChange}
//                     accept=".pdf,.doc,.docx,image/*"
//                   />
//                 </div>
//               </div>
//               {filePreviewUrl && (
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <div className="col-span-1"></div>
//                   <div className="col-span-3">
//                     {selectedFile?.type.startsWith('image/') ? (
//                       <Image 
//                         src={filePreviewUrl} 
//                         alt="File Preview" 
//                         width={500} 
//                         height={300} 
//                         className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
//                         style={{ width: 'auto', height: 'auto' }} 
//                       />
//                     ) : (
//                       <p className="text-gray-600">File selected: {selectedFile?.name}</p>
//                     )}
//                   </div>
//                 </div>
//               )}
//               {!selectedFile && editingPoll && (editingPoll.description_file_url || editingPoll.description_image_url) && (
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <div className="col-span-1"></div>
//                   <div className="col-span-3">
//                     {editingPoll.description_image_url ? (
//                       <Image 
//                         src={editingPoll.description_image_url} 
//                         alt="Existing Image" 
//                         width={500} 
//                         height={300} 
//                         className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
//                         style={{ width: 'auto', height: 'auto' }} 
//                       />
//                     ) : (
//                       <p className="text-gray-600">
//                         Existing File: <a 
//                           href={editingPoll.description_file_url || '#'} 
//                           target="_blank" 
//                           rel="noopener noreferrer"
//                           className="text-blue-600 hover:text-blue-800 underline"
//                         >
//                           View Document
//                         </a>
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//             <DialogFooter>
//               <Button
//                 type="submit"
//                 onClick={editingPoll ? handleUpdatePoll : handleCreatePoll}
//                 disabled={loading}
//                 className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300"
//               >
//                 {editingPoll ? "Update Poll" : "Create Poll"}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </div>

//       <Table className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 bg-gray-500">
//         <TableHeader className="rounded-t-2xl">
//           <TableRow className="">
//             <TableHead className="text-white font-bold">Title</TableHead>
//             <TableHead className="text-white font-bold">Deadline</TableHead>
//             <TableHead className="text-white font-bold">Total Votes</TableHead>
//             <TableHead className="text-white font-bold text-right">Actions</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {polls.map((poll, index) => (
//             <TableRow 
//               key={poll.id}
//               className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}
//             >
//               <TableCell className="font-medium text-gray-800">{poll.title}</TableCell>
//               <TableCell className="text-gray-600">
//                 {poll.deadline
//                   ? new Date(poll.deadline).toLocaleString()
//                   : "N/A"}
//               </TableCell>
//               <TableCell className="text-gray-600">
//                 {poll.options.reduce((sum, option) => sum + option.votes, 0)}
//               </TableCell>
//               <TableCell className="text-right space-x-2">
//                 <Button 
//                   variant="outline" 
//                   size="sm" 
//                   onClick={() => handleEditPoll(poll)}
//                   className="border-blue-500 text-blue-500 hover:bg-blue-50 rounded-lg"
//                 >
//                   Edit
//                 </Button>
//                 <Button
//                   variant="destructive"
//                   size="sm"
//                   onClick={() => handleDeletePoll(poll.id)}
//                   className="bg-red-500 hover:bg-red-600 text-white rounded-lg"
//                 >
//                   Delete
//                 </Button>
//               </TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>
//     </div>
//   );
// };

// export default ManagePollsPage;
