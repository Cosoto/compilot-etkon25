-- Create the employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Operator', 'Trainer', 'Hancho', 'Teamleader')),
    contract_type TEXT NOT NULL CHECK (contract_type IN ('Permanent', 'Temporary')),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create an index on team_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON employees(team_id);

-- Create a composite index on first_name and last_name for faster searches
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(first_name, last_name);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- First, drop ALL existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view employees" ON employees;
DROP POLICY IF EXISTS "Allow admin users to insert employees" ON employees;
DROP POLICY IF EXISTS "Allow admin users to update employees" ON employees;
DROP POLICY IF EXISTS "Allow admin users to delete employees" ON employees;
DROP POLICY IF EXISTS "Allow team editors to insert employees" ON employees;
DROP POLICY IF EXISTS "Allow team editors to update employees" ON employees;
DROP POLICY IF EXISTS "Allow team editors to delete employees" ON employees;

-- Create policies for employees table
-- View policy - allow all authenticated users to view
CREATE POLICY "Allow authenticated users to view employees"
    ON employees FOR SELECT
    TO authenticated
    USING (true);

-- Insert policies
CREATE POLICY "Allow admin users to insert employees"
    ON employees FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Allow team editors to insert employees"
    ON employees FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_permissions.user_id = auth.uid()
            AND user_permissions.team_id = NEW.team_id
            AND user_permissions.can_edit = true
        )
    );

-- Update policies
CREATE POLICY "Allow admin users to update employees"
    ON employees FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Allow team editors to update employees"
    ON employees FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_permissions.user_id = auth.uid()
            AND user_permissions.team_id = OLD.team_id
            AND user_permissions.can_edit = true
        )
    );

-- Delete policies
CREATE POLICY "Allow admin users to delete employees"
    ON employees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Allow team editors to delete employees"
    ON employees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_permissions.user_id = auth.uid()
            AND user_permissions.team_id = OLD.team_id
            AND user_permissions.can_edit = true
        )
    );

-- Add a comment to the table
COMMENT ON TABLE employees IS 'Stores information about employees including their role and contract type';

-- Add comments to columns
COMMENT ON COLUMN employees.id IS 'Unique identifier for the employee';
COMMENT ON COLUMN employees.first_name IS 'Employee''s first name';
COMMENT ON COLUMN employees.last_name IS 'Employee''s last name';
COMMENT ON COLUMN employees.role IS 'Employee''s role (Operator, Trainer, Hancho, Teamleader)';
COMMENT ON COLUMN employees.contract_type IS 'Type of employment contract (Permanent or Temporary)';
COMMENT ON COLUMN employees.team_id IS 'Reference to the team the employee belongs to';
COMMENT ON COLUMN employees.created_at IS 'Timestamp when the employee record was created';
COMMENT ON COLUMN employees.updated_at IS 'Timestamp when the employee record was last updated'; 