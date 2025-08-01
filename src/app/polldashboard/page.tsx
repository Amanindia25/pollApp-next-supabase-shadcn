// 'use client';

// import React, { useEffect, useState } from 'react';
// import { createClient } from '@/lib/supabase/client';
// import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { Progress } from '@/components/ui/progress';
// import { Label } from '@/components/ui/label';
// import { toast } from 'sonner';
// import { PollChart } from '@/components/ui/poll-chart';

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

// interface PollResponse {
//   poll_id: string;
//   user_id: string;
//   selected_option: string;
// }

// const hasVoted = (pollId: string, userResponses: PollResponse[]) => {
//   return userResponses.some(response => response.poll_id === pollId);
// };

// const calculateResults = (poll: Poll) => {
//   const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
//   return poll.options.map(option => ({
//     ...option,
//     percentage: totalVotes === 0 ? 0 : (option.votes / totalVotes) * 100
//   }));
// };

// const PollsPage = () => {
//   const [polls, setPolls] = useState<Poll[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [userResponses, setUserResponses] = useState<PollResponse[]>([]);
//   const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
//   const [submittingVote, setSubmittingVote] = useState<string | null>(null);
//   const [forceShowResults, setForceShowResults] = useState<{[key: string]: boolean}>({});
//   const supabase = createClient();

//   useEffect(() => {
//     const fetchPollsAndResponses = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const { data: { user } } = await supabase.auth.getUser();
//         if (!user) {
//           setError('User not logged in.');
//           setLoading(false);
//           return;
//         }

//         const { data: pollsData, error: pollsError } = await supabase
//           .from('polls')
//           .select('*');

//         if (pollsError) throw pollsError;

//         const { data: responsesData, error: responsesError } = await supabase
//           .from('poll_responses')
//           .select('*')
//           .eq('user_id', user.id);

//         if (responsesError) throw responsesError;

//         setPolls(pollsData || []);
//         setUserResponses(responsesData || []);
//       } catch (err: unknown) {
//         const errorMessage = err instanceof Error ? err.message : 'Unknown error';
//         console.error('Error fetching data:', errorMessage);
//         setError('Failed to fetch polls or responses: ' + errorMessage);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPollsAndResponses();
//   }, [supabase]);

//   const handleVote = async (pollId: string) => {
//     const selectedOption = selectedOptions[pollId];
//     if (!selectedOption) {
//       toast.error('Please select an option before voting.');
//       return;
//     }

//     setSubmittingVote(pollId);
//     setError(null);

//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         throw new Error('User not logged in.');
//       }

//       const { data: response, error: responseError } = await supabase
//         .rpc('submit_vote', {
//           p_poll_id: pollId,
//           p_user_id: user.id,
//           p_selected_option: selectedOption
//         });

//       if (responseError) throw responseError;

//       const updatedPolls = polls.map(poll => {
//         if (poll.id === pollId) {
//           const updatedOptions = poll.options.map(option =>
//             option.text === selectedOption 
//               ? { ...option, votes: option.votes + 1 } 
//               : option
//           );
//           return { ...poll, options: updatedOptions };
//         }
//         return poll;
//       });

//       setPolls(updatedPolls);
//       setUserResponses(prev => [...prev, { 
//         poll_id: pollId, 
//         user_id: user.id, 
//         selected_option: selectedOption 
//       }]);

//       toast.success('Vote submitted successfully!');
//     } catch (err: unknown) {
//       const errorMessage = err instanceof Error ? err.message : 'Unknown error';
//       toast.error('Failed to submit vote: ' + errorMessage);
//       setError('Failed to submit vote: ' + errorMessage);
//     } finally {
//       setSubmittingVote(null);
//     }
//   };

//   return (
//     <div className="container mx-auto px-4 py-8">
//       <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Active Polls</h1>
//       {polls.length === 0 && !loading && (
//         <div className="text-center text-gray-500 mt-8">
//           No active polls available at the moment.
//         </div>
//       )}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {polls.map(poll => {
//           const voted = hasVoted(poll.id, userResponses);
//           const results = calculateResults(poll);
//           const deadlinePassed = poll.deadline ? new Date(poll.deadline) < new Date() : false;
//           const isSubmitting = submittingVote === poll.id;
//           const showResults = voted || deadlinePassed || forceShowResults[poll.id];

//           return (
//             <Card key={poll.id} className="flex flex-col w-full sm:w-3/4 lg:w-2/3 mx-auto">
//               <CardHeader>
//                 <CardTitle className="flex justify-between items-start text-lg sm:text-xl">
//                   <span>{poll.title}</span>
//                   {poll.deadline && (
//                     <span className="text-sm text-gray-500">
//                       {deadlinePassed ? 'Ended' : 'Ends'}: {new Date(poll.deadline).toLocaleDateString()}
//                     </span>
//                   )}
//                 </CardTitle>
//               </CardHeader>
              
//               <CardContent className="flex-grow">
//                 {/* Display attached files/images if available */}
//                 {(poll.description_image_url || poll.description_file_url) && (
//                   <div className="mb-4">
//                     {poll.description_image_url && (
//                       <img 
//                         src={poll.description_image_url} 
//                         alt="Poll description" 
//                         className="max-w-full h-auto rounded-lg mb-2"
//                       />
//                     )}
//                     {poll.description_file_url && (
//                       <a 
//                         href={poll.description_file_url}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="text-blue-500 hover:text-blue-700 underline"
//                       >
//                         View attached document
//                       </a>
//                     )}
//                   </div>
//                 )}

//                 {/* Display extracted text if available */}
//                 {poll.description_text && (
//                   <div className="mb-4 p-4 bg-gray-50 rounded-lg">
//                     <h3 className="font-medium mb-2">Description:</h3>
//                     <p className="text-sm text-gray-600 whitespace-pre-wrap">
//                       {poll.description_text}
//                     </p>
//                   </div>
//                 )}

//                 {/* Voting Interface or Results */}
//                 {showResults ? (
//                   <div className="space-y-4">
//                     <h3 className="font-medium">Results:</h3>
//                     <PollChart options={poll.options} />
//                     <div className="space-y-2">
//                       {results.map((option, index) => (
//                         <div key={index} className="space-y-1">
//                           <div className="flex justify-between text-sm">
//                             <span>{option.text}</span>
//                             <span>{option.votes} votes ({option.percentage.toFixed(1)}%)</span>
//                           </div>
//                           <Progress value={option.percentage} className="h-2" />
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     <RadioGroup
//                       value={selectedOptions[poll.id] || ''}
//                       onValueChange={(value) => 
//                         setSelectedOptions(prev => ({ ...prev, [poll.id]: value }))
//                       }
//                     >
//                       {poll.options.map((option, index) => (
//                         <div key={index} className="flex items-center space-x-2">
//                           <RadioGroupItem value={option.text} id={`${poll.id}-${index}`} />
//                           <Label htmlFor={`${poll.id}-${index}`} className="cursor-pointer">
//                             {option.text}
//                           </Label>
//                         </div>
//                       ))}
//                     </RadioGroup>
//                   </div>
//                 )}
//               </CardContent>

//               <CardFooter className="flex flex-col sm:flex-row justify-between gap-4">
//                 {!showResults && (
//                   <Button 
//                     onClick={() => handleVote(poll.id)} 
//                     disabled={!selectedOptions[poll.id] || isSubmitting}
//                     className="w-full sm:w-auto"
//                   >
//                     {isSubmitting ? 'Submitting...' : 'Submit Vote'}
//                   </Button>
//                 )}
//                 {!voted && !deadlinePassed && !forceShowResults[poll.id] && (
//                   <Button
//                     onClick={() => setForceShowResults(prev => ({ ...prev, [poll.id]: true }))}
//                     className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800"
//                   >
//                     Show Results
//                   </Button>
//                 )}
//                 {showResults && (
//                   <span className="text-sm text-gray-500">
//                     {voted ? 'You have voted' : 'Voting ended'}
//                   </span>
//                 )}
//               </CardFooter>
//             </Card>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default PollsPage;























//--------------------------------------------
// 'use client';

// import React, { useEffect, useState } from 'react';
// import { createClient } from '@/lib/supabase/client';
// import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { Progress } from '@/components/ui/progress';
// import { Label } from '@/components/ui/label';
// import { toast } from 'sonner';
// import { PollChart } from '@/components/ui/poll-chart';

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

// interface PollResponse {
//   poll_id: string;
//   user_id: string;
//   selected_option: string;
// }

// const hasVoted = (pollId: string, userResponses: PollResponse[]) => {
//   return userResponses.some(response => response.poll_id === pollId);
// };

// const calculateResults = (poll: Poll) => {
//   const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
//   return poll.options.map(option => ({
//     ...option,
//     percentage: totalVotes === 0 ? 0 : (option.votes / totalVotes) * 100
//   }));
// };

// const PollsPage = () => {
//   const [polls, setPolls] = useState<Poll[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [userResponses, setUserResponses] = useState<PollResponse[]>([]);
//   const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
//   const [submittingVote, setSubmittingVote] = useState<string | null>(null);
//   const supabase = createClient();

//   useEffect(() => {
//     const fetchPollsAndResponses = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const { data: { user } } = await supabase.auth.getUser();
//         if (!user) {
//           setError('User not logged in.');
//           setLoading(false);
//           return;
//         }

//         const { data: pollsData, error: pollsError } = await supabase
//           .from('polls')
//           .select('*');

//         if (pollsError) throw pollsError;

//         const { data: responsesData, error: responsesError } = await supabase
//           .from('poll_responses')
//           .select('*')
//           .eq('user_id', user.id);

//         if (responsesError) throw responsesError;

//         setPolls(pollsData || []);
//         setUserResponses(responsesData || []);
//       } catch (err: unknown) {
//         const errorMessage = err instanceof Error ? err.message : 'Unknown error';
//         console.error('Error fetching data:', errorMessage);
//         setError('Failed to fetch polls or responses: ' + errorMessage);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPollsAndResponses();
//   }, [supabase]);

//   const handleVote = async (pollId: string) => {
//     const selectedOption = selectedOptions[pollId];
//     if (!selectedOption) {
//       toast.error('Please select an option before voting.');
//       return;
//     }

//     setSubmittingVote(pollId);
//     setError(null);

//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         throw new Error('User not logged in.');
//       }

//       const { data: response, error: responseError } = await supabase
//         .rpc('submit_vote', {
//           p_poll_id: pollId,
//           p_user_id: user.id,
//           p_selected_option: selectedOption
//         });

//       if (responseError) throw responseError;

//       const updatedPolls = polls.map(poll => {
//         if (poll.id === pollId) {
//           const updatedOptions = poll.options.map(option =>
//             option.text === selectedOption 
//               ? { ...option, votes: option.votes + 1 } 
//               : option
//           );
//           return { ...poll, options: updatedOptions };
//         }
//         return poll;
//       });

//       setPolls(updatedPolls);
//       setUserResponses(prev => [...prev, { 
//         poll_id: pollId, 
//         user_id: user.id, 
//         selected_option: selectedOption 
//       }]);

//       toast.success('Vote submitted successfully!');
//     } catch (err: unknown) {
//       const errorMessage = err instanceof Error ? err.message : 'Unknown error';
//       toast.error('Failed to submit vote: ' + errorMessage);
//       setError('Failed to submit vote: ' + errorMessage);
//     } finally {
//       setSubmittingVote(null);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 px-4 py-8 rounded-2xl">
//       <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
//         Active Polls
//       </h1>
//       {loading && (
//         <div className="text-center text-gray-600 text-lg animate-pulse">
//           Loading polls...
//         </div>
//       )}
//       {error && (
//         <div className="text-center text-red-500 text-lg font-medium bg-red-100 p-4 rounded-lg">
//           {error}
//         </div>
//       )}
//       {polls.length === 0 && !loading && (
//         <div className="text-center text-gray-500 text-lg bg-gray-100 p-6 rounded-lg shadow-md">
//           No active polls available at the moment.
//         </div>
//       )}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//         {polls.map(poll => {
//           const voted = hasVoted(poll.id, userResponses);
//           const results = calculateResults(poll);
//           const deadlinePassed = poll.deadline ? new Date(poll.deadline) < new Date() : false;
//           const isSubmitting = submittingVote === poll.id;
//           const showResults = voted || deadlinePassed;

//           return (
//             <Card 
//               key={poll.id} 
//               className="flex flex-col bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-3xl overflow-hidden border border-gray-200"
//             >
//               <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
//                 <CardTitle className="flex justify-between items-center text-lg">
//                   <span className="font-bold">{poll.title}</span>
//                   {poll.deadline && (
//                     <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
//                       {deadlinePassed ? 'Ended' : 'Ends'}: {new Date(poll.deadline).toLocaleDateString()}
//                     </span>
//                   )}
//                 </CardTitle>
//               </CardHeader>
              
//               <CardContent className="flex-grow p-6">
//                 {(poll.description_image_url || poll.description_file_url) && (
//                   <div className="mb-4">
//                     {poll.description_image_url && (
//                       <img 
//                         src={poll.description_image_url} 
//                         alt="Poll description" 
//                         className="max-w-full h-auto rounded-3xl mb-2 border border-gray-200 shadow-sm"
//                       />
//                     )}
//                     {poll.description_file_url && (
//                       <a 
//                         href={poll.description_file_url}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="text-blue-600 hover:text-blue-800 underline transition-colors duration-200"
//                       >
//                         View attached document
//                       </a>
//                     )}
//                   </div>
//                 )}

//                 {poll.description_text && (
//                   <div className="mb-4 p-4 bg-gray-50 rounded-lg shadow-inner">
//                     <h3 className="font-semibold text-gray-700 mb-2">Description:</h3>
//                     <p className="text-sm text-gray-600 whitespace-pre-wrap">
//                       {poll.description_text}
//                     </p>
//                   </div>
//                 )}

//                 {showResults ? (
//                   <div className="space-y-4">
//                     <h3 className="font-semibold text-gray-800">Results:</h3>
//                     <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden">
//                       <PollChart 
//                         options={poll.options} 
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       {results.map((option, index) => (
//                         <div key={index} className="space-y-1">
//                           <div className="flex justify-between text-sm text-gray-700">
//                             <span>{option.text}</span>
//                             <span>{option.votes} votes ({option.percentage.toFixed(1)}%)</span>
//                           </div>
//                           <Progress 
//                             value={option.percentage} 
//                             className="h-2 bg-gray-200 rounded-full"
//                             // indicatorClassName="bg-gradient-to-r from-blue-500 to-purple-500"
//                           />
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     <RadioGroup
//                       value={selectedOptions[poll.id] || ''}
//                       onValueChange={(value) => 
//                         setSelectedOptions(prev => ({ ...prev, [poll.id]: value }))
//                       }
//                       className="space-y-2"
//                     >
//                       {poll.options.map((option, index) => (
//                         <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
//                           <RadioGroupItem 
//                             value={option.text} 
//                             id={`${poll.id}-${index}`} 
//                             className="text-blue-500 focus:ring-blue-500"
//                           />
//                           <Label 
//                             htmlFor={`${poll.id}-${index}`} 
//                             className="cursor-pointer text-gray-700 hover:text-blue-600 transition-colors duration-200"
//                           >
//                             {option.text}
//                           </Label>
//                         </div>
//                       ))}
//                     </RadioGroup>
//                   </div>
//                 )}
//               </CardContent>

//               <CardFooter className="flex justify-end p-4 bg-gray-50">
//                 {!showResults && (
//                   <Button 
//                     onClick={() => handleVote(poll.id)} 
//                     disabled={!selectedOptions[poll.id] || isSubmitting}
//                     className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
//                   >
//                     {isSubmitting ? 'Submitting...' : 'Submit Vote'}
//                   </Button>
//                 )}
//                 {showResults && (
//                   <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
//                     {voted ? 'You have voted' : 'Voting ended'}
//                   </span>
//                 )}
//               </CardFooter>
//             </Card>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default PollsPage;

















































'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PollChart } from '@/components/ui/poll-chart';

// Define types manually
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

// Helper functions with type annotations
const hasVoted = (pollId: string, userResponses: PollResponse[]): boolean => {
  return userResponses.some(response => response.poll_id === pollId);
};

const calculateResults = (poll: Poll): { text: string; votes: number; percentage: number }[] => {
  const totalVotes = poll.options.reduce((sum: number, option: PollOption) => sum + option.votes, 0);
  return poll.options.map((option: PollOption) => ({
    ...option,
    percentage: totalVotes === 0 ? 0 : (option.votes / totalVotes) * 100
  }));
};

const PollsPage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userResponses, setUserResponses] = useState<PollResponse[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [submittingVote, setSubmittingVote] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>({});
  const supabase = createClient();

  useEffect(() => {
    const fetchPollsAndResponses = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Please log in to view polls.');
          return;
        }

        const [{ data: pollsData, error: pollsError }, { data: responsesData, error: responsesError }] = 
          await Promise.all([
            supabase.from('polls').select('*'),
            supabase.from('poll_responses').select('*').eq('user_id', user.id)
          ]);

        if (pollsError) throw new Error(pollsError.message);
        if (responsesError) throw new Error(responsesError.message);

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
    const originalPolls = [...polls];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in.');

      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          const updatedOptions = poll.options.map((option: PollOption) =>
            option.text === selectedOption ? { ...option, votes: option.votes + 1 } : option
          );
          return { ...poll, options: updatedOptions };
        }
        return poll;
      }));

      const { error: responseError } = await supabase
        .rpc('submit_vote', {
          p_poll_id: pollId,
          p_user_id: user.id,
          p_selected_option: selectedOption
        });

      if (responseError) throw new Error(responseError.message);

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
      setPolls(originalPolls);
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
          const isSubmitting = submittingVote === poll.id;
          const isResultVisible = showResults[poll.id] || false;

          return (
            <Card key={poll.id} className="flex flex-col w-full max-w-md mx-auto">
              <CardHeader className='bg-red'>
                <CardTitle className="flex justify-between items-start text-lg sm:text-xl">
                  <span>{poll.title}</span>
                  {poll.deadline && (
                    <span className="text-sm text-gray-500">
                      {new Date(poll.deadline) < new Date() ? 'Ended' : 'Ends'}: {new Date(poll.deadline).toLocaleDateString()}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-grow">
                {(poll.description_image_url || poll.description_file_url) && (
                  <div className="mb-4">
                    {poll.description_image_url && (
                      <img 
                        src={poll.description_image_url} 
                        alt="Poll description" 
                        className="max-w-full h-auto rounded-lg mb-2"
                        loading="lazy"
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

                {poll.description_text && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Description:</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {poll.description_text}
                    </p>
                  </div>
                )}

                {!isResultVisible && (
                  <div className="space-y-4">
                    {!voted ? (
                      <RadioGroup
                        value={selectedOptions[poll.id] || ''}
                        onValueChange={(value: string) => 
                          setSelectedOptions(prev => ({ ...prev, [poll.id]: value }))
                        }
                        aria-label={`Options for ${poll.title}`}
                      >
                        {poll.options.map((option: PollOption, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value={option.text} 
                              id={`${poll.id}-${index}`} 
                              aria-describedby={`${poll.id}-description`} 
                            />
                            <Label htmlFor={`${poll.id}-${index}`} className="cursor-pointer">
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <p className="text-center text-gray-500">You have already voted</p>
                    )}
                  </div>
                )}

                {isResultVisible && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Results:</h3>
                    <PollChart options={poll.options} />
                    <div className="space-y-2">
                      {results.map((option: { text: string; votes: number; percentage: number }, index: number) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{option.text}</span>
                            <span>{option.votes} votes ({option.percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row justify-between gap-4">
                {!isResultVisible && !voted && (
                  <Button 
                    onClick={() => handleVote(poll.id)} 
                    disabled={!selectedOptions[poll.id] || isSubmitting}
                    className="w-full sm:w-auto"
                    aria-label={`Submit vote for ${poll.title}`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Vote'}
                  </Button>
                )}
                <Button
                  onClick={() => setShowResults(prev => ({ ...prev, [poll.id]: !prev[poll.id] }))}
                  className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800"
                  aria-label={isResultVisible ? `Close results for ${poll.title}` : `Show results for ${poll.title}`}
                >
                  {isResultVisible ? 'Close Result' : 'Show Result'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PollsPage;