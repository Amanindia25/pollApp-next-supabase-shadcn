-- Create polls table
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of { text: string, votes: number }
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create poll_responses table
CREATE TABLE poll_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (poll_id, user_id) -- Ensure a user can only vote once per poll
);

-- Enable Row Level Security (RLS) for polls table
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- Policy for polls: authenticated users can view all polls
CREATE POLICY "Authenticated users can view polls" ON polls
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for polls: authenticated users can create polls
CREATE POLICY "Authenticated users can create polls" ON polls
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for polls: authenticated users can update their own polls
CREATE POLICY "Authenticated users can update own polls" ON polls
  FOR UPDATE USING (auth.uid() = created_by);

-- Policy for polls: authenticated users can delete their own polls
CREATE POLICY "Authenticated users can delete own polls" ON polls
  FOR DELETE USING (auth.uid() = created_by);

-- Enable Row Level Security (RLS) for poll_responses table
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- Policy for poll_responses: authenticated users can view their own responses
CREATE POLICY "Authenticated users can view own poll responses" ON poll_responses
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for poll_responses: authenticated users can insert responses
CREATE POLICY "Authenticated users can insert poll responses" ON poll_responses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');