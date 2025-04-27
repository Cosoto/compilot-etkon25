-- Add new policy to allow team editors to insert employees
CREATE POLICY "Allow team editors to insert employees"
    ON employees FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_permissions.user_id = auth.uid()
            AND user_permissions.team_id = team_id
            AND user_permissions.can_edit = true
        )
    );

-- Add new policy to allow team editors to update their team's employees
CREATE POLICY "Allow team editors to update employees"
    ON employees FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_permissions.user_id = auth.uid()
            AND user_permissions.team_id = employees.team_id
            AND user_permissions.can_edit = true
        )
    );

-- Add new policy to allow team editors to delete their team's employees
CREATE POLICY "Allow team editors to delete employees"
    ON employees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_permissions.user_id = auth.uid()
            AND user_permissions.team_id = employees.team_id
            AND user_permissions.can_edit = true
        )
    ); 