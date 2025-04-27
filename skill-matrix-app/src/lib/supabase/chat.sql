-- Create an enum for message status
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');

-- Create the support_chat table
CREATE TABLE IF NOT EXISTS support_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status message_status DEFAULT 'sent',
    is_admin_message BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_id UUID NOT NULL -- To group messages by session for easy cleanup
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_chat_session ON support_chat(session_id);
CREATE INDEX IF NOT EXISTS idx_support_chat_sender ON support_chat(sender_id);

-- Enable Row Level Security
ALTER TABLE support_chat ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat messages"
    ON support_chat FOR SELECT
    TO authenticated
    USING (
        sender_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can insert their own chat messages"
    ON support_chat FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
    );

CREATE POLICY "Only admins can update message status"
    ON support_chat FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Function to clean up old chat sessions
CREATE OR REPLACE FUNCTION cleanup_chat_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
    DELETE FROM support_chat WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 