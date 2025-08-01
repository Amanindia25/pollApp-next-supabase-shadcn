'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PollChart } from '@/components/ui/poll-chart';

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

interface PollResponse {
  poll_id: string;
  user_id: string;
  selected_option: string;
}

const hasVoted = (pollId: string, userResponses: PollResponse[]) => {
  return userResponses.some(response => response.poll_id === pollId);
};

const calculateResults = (poll: Poll) => {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  return poll.options.map(option => ({
    ...option,
    percentage: totalVotes === 0 ? 0 : (option.votes / totalVotes) * 100
  }));
};

const PollsPage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userResponses, setUserResponses] = useState<PollResponse[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [submittingVote, setSubmittingVote] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchPollsAndResponses = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not logged in.');
          setLoading(false);
          return;
        }

        const { data: pollsData, error: pollsError } = await supabase
          .from('polls')
          .select('*');

        if (pollsError) throw pollsError;

        const { data: responsesData, error: responsesError } = await supabase
          .from('poll_responses')
          .select('*')
          .eq('user_id', user.id);

        if (responsesError) throw responsesError;

        setPolls(pollsData || []);
        setUserResponses(responsesData || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error fetching data:', errorMessage);
        setError('Failed to fetch polls or responses: ' + errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPollsAndResponses();
  }, [supabase]);

  const handleVote = async (pollId: string) => {
    const selectedOption = selectedOptions[pollId];
    if (!selectedOption) {
      toast.error('Please select an option before voting.');
      return;
    }

    setSubmittingVote(pollId);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not logged in.');
      }

      const { data: response, error: responseError } = await supabase
        .rpc('submit_vote', {
          p_poll_id: pollId,
          p_user_id: user.id,
          p_selected_option: selectedOption
        });

      if (responseError) throw responseError;

      const updatedPolls = polls.map(poll => {
        if (poll.id === pollId) {
          const updatedOptions = poll.options.map(option =>
            option.text === selectedOption 
              ? { ...option, votes: option.votes + 1 } 
              : option
          );
          return { ...poll, options: updatedOptions };
        }
        return poll;
      });

      setPolls(updatedPolls);
      setUserResponses(prev => [...prev, { 
        poll_id: pollId, 
        user_id: user.id, 
        selected_option: selectedOption 
      }]);

      toast.success('Vote submitted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to submit vote: ' + errorMessage);
      setError('Failed to submit vote: ' + errorMessage);
    } finally {
      setSubmittingVote(null);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Loading polls...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 rounded-[20px]">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Active Polls</h1>
      {polls.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No active polls available at the moment.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map(poll => {
          const voted = hasVoted(poll.id, userResponses);
          const results = calculateResults(poll);
          const deadlinePassed = poll.deadline ? new Date(poll.deadline) < new Date() : false;
          const isSubmitting = submittingVote === poll.id;
          const showResults = voted || deadlinePassed;

          return (
            <Card key={poll.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{poll.title}</span>
                  {poll.deadline && (
                    <span className="text-sm text-gray-500">
                      {deadlinePassed ? 'Ended' : 'Ends'}: {new Date(poll.deadline).toLocaleDateString()}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-grow">
                {/* Display attached files/images if available */}
                {(poll.description_image_url || poll.description_file_url) && (
                  <div className="mb-4">
                    {poll.description_image_url && (
                      <img 
                        src={poll.description_image_url} 
                        alt="Poll description" 
                        className="max-w-full h-auto rounded-lg mb-2"
                      />
                    )}
                    {poll.description_file_url && (
                      <a 
                        href={poll.description_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 underline"
                      >
                        View attached document
                      </a>
                    )}
                  </div>
                )}

                {/* Display extracted text if available */}
                {poll.description_text && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Description:</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {poll.description_text}
                    </p>
                  </div>
                )}

                {/* Voting Interface or Results */}
                {showResults ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">Results:</h3>
                    <PollChart options={poll.options} />
                    <div className="space-y-2">
                      {results.map((option, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{option.text}</span>
                            <span>{option.votes} votes ({option.percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={option.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <RadioGroup
                      value={selectedOptions[poll.id] || ''}
                      onValueChange={(value) => 
                        setSelectedOptions(prev => ({ ...prev, [poll.id]: value }))
                      }
                    >
                      {poll.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.text} id={`${poll.id}-${index}`} />
                          <Label htmlFor={`${poll.id}-${index}`} className="cursor-pointer">
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-end">
                {!showResults && (
                  <Button 
                    onClick={() => handleVote(poll.id)} 
                    disabled={!selectedOptions[poll.id] || isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Vote'}
                  </Button>
                )}
                {showResults && (
                  <span className="text-sm text-gray-500">
                    {voted ? 'You have voted' : 'Voting ended'}
                  </span>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PollsPage;
