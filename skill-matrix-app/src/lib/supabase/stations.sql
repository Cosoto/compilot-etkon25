-- Modify the stations table to add production_line_id
ALTER TABLE stations 
ADD COLUMN IF NOT EXISTS production_line_id UUID REFERENCES production_lines(id) ON DELETE CASCADE;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stations_production_line_id ON stations(production_line_id);

-- Enable Row Level Security
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

-- Create policies for stations table
-- View policy - users can view stations if they have access to the production line
CREATE POLICY "Allow users to view stations based on production line access"
    ON stations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN teams t ON t.id = up.team_id
            WHERE up.user_id = auth.uid()
            AND t.production_line_id = stations.production_line_id
            AND up.can_view = true
        )
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Insert policy - users can add stations if they have edit access to any team in the production line
CREATE POLICY "Allow users to insert stations"
    ON stations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN teams t ON t.id = up.team_id
            WHERE up.user_id = auth.uid()
            AND t.production_line_id = production_line_id
            AND up.can_edit = true
        )
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Update policy
CREATE POLICY "Allow users to update stations"
    ON stations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN teams t ON t.id = up.team_id
            WHERE up.user_id = auth.uid()
            AND t.production_line_id = stations.production_line_id
            AND up.can_edit = true
        )
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Delete policy
CREATE POLICY "Allow users to delete stations"
    ON stations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN teams t ON t.id = up.team_id
            WHERE up.user_id = auth.uid()
            AND t.production_line_id = stations.production_line_id
            AND up.can_edit = true
        )
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    ); 