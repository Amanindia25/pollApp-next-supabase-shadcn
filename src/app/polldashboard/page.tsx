'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';

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

interface PollResponse {
  poll_id: string;
  user_id: string;
  selected_option: string;
}

const PollsPage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userResponses, setUserResponses] = useState<PollResponse[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
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

        // Fetch polls
        const { data: pollsData, error: pollsError } = await supabase
          .from('polls')
          .select('*');

        if (pollsError) throw pollsError;

        // Fetch user responses
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
      alert('Please select an option before voting.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not logged in.');
        setLoading(false);
        return;
      }

      // Insert response
      const { error: responseError } = await supabase.from('poll_responses').insert({
        poll_id: pollId,
        user_id: user.id,
        selected_option: selectedOption,
      });

      if (responseError) throw responseError;

      // Update poll votes (this part needs a Supabase function or RLS policy for security)
      // For now, we'll simulate client-side update for display
      const updatedPolls = polls.map(poll => {
        if (poll.id === pollId) {
          const updatedOptions = poll.options.map(option =>
            option.text === selectedOption ? { ...option, votes: option.votes + 1 } : option
          );
          return { ...poll, options: updatedOptions };
        }
        return poll;
      });
      setPolls(updatedPolls);

      // Add to user responses
      setUserResponses(prev => [...prev, { poll_id: pollId, user_id: user.id, selected_option: selectedOption }]);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error submitting vote:', errorMessage);
      setError('Failed to submit vote: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const hasVoted = (pollId: string) => {
    return userResponses.some(response => response.poll_id === pollId);
  };

  const calculateResults = (poll: Poll) => {
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
    return poll.options.map(option => ({
      ...option,
      percentage: totalVotes === 0 ? 0 : (option.votes / totalVotes) * 100,
    }));
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading polls...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Active Polls</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map(poll => {
          const voted = hasVoted(poll.id);
          const results = calculateResults(poll);
          const deadlinePassed = poll.deadline ? new Date(poll.deadline) < new Date() : false;

          return (
            <Card key={poll.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{poll.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                {voted || deadlinePassed ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-2">Results:</h3>
                    {results.map((option, index) => (
                      <div key={index} className="mb-2">
                        <div className="flex justify-between mb-1">
                          <span>{option.text}</span>
                          <span>{option.votes} votes ({option.percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={option.percentage} className="w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <RadioGroup
                    onValueChange={(value: string) => setSelectedOptions(prev => ({ ...prev, [poll.id]: value }))}
                    value={selectedOptions[poll.id] || ''}
                  >
                    {poll.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value={option.text} id={`option-${poll.id}-${index}`} />
                        <Label htmlFor={`option-${poll.id}-${index}`}>{option.text}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                {poll.deadline && (
                  <span className="text-sm text-gray-500">
                    Deadline: {new Date(poll.deadline).toLocaleString()}
                  </span>
                )}
                {!voted && !deadlinePassed && (
                  <Button onClick={() => handleVote(poll.id)} disabled={!selectedOptions[poll.id] || loading}>
                    Submit Vote
                  </Button>
                )}
                {(voted || deadlinePassed) && (
                  <span className="text-sm text-gray-500">
                    {voted ? 'You have already voted.' : 'Voting has ended.'}
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