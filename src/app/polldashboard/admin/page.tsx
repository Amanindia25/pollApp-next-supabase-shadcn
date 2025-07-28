"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

import { toast } from "sonner";
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';

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
}

const ManagePollsPage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState("");
  const [newPollDeadline, setNewPollDeadline] = useState<Date | null>(null);
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["", ""]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const handleCreatePoll = async () => {
    if (!newPollTitle || newPollOptions.some((option) => !option.trim())) {
      toast.error("Please fill in all required fields (Title and Options).");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not logged in.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("polls").insert({
        title: newPollTitle,
        options: newPollOptions.map((text) => ({ text, votes: 0 })),
        deadline: newPollDeadline?.toISOString() || null,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      toast.success("Poll created successfully!");
      setIsDialogOpen(false);
      setNewPollTitle("");
      setNewPollDeadline(null);
      setNewPollOptions(["", ""]);
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

  const handleDeletePoll = async (pollId: string) => {
    if (!window.confirm("Are you sure you want to delete this poll?")) {
      return;
    }

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("polls")
        .delete()
        .eq("id", pollId);
      if (deleteError) throw deleteError;

      toast.success("Poll deleted successfully!");
      setPolls(polls.filter((poll) => poll.id !== pollId));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Poll</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Poll</DialogTitle>
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
                {/* <DatePicker
                  selected={newPollDeadline}
                  onChange={(date: Date | null) => setNewPollDeadline(date)}
                  showTimeSelect
                  dateFormat="Pp"
                  className="col-span-3 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                /> */}
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
              {/* Optional: Image Upload - Placeholder for future implementation */}
              {/* <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">
                  Image
                </Label>
                <Input id="image" type="file" className="col-span-3" />
              </div> */}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleCreatePoll}
                disabled={loading}
              >
                Create Poll
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
                <Button variant="outline" size="sm" className="mr-2">
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
