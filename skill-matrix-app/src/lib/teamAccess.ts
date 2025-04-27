import { supabase } from './supabase/client'; // Use relative path to client
import { TeamAccess } from './schema';

/**
 * Get user role - Helper function
 */
async function getUserRole(userId: string): Promise<'admin' | 'user' | null> {
    const { data, error } = await supabase
        .from('users') // Ensure you have a 'users' table with a 'role' column
        .select('role')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error checking user role:', error);
        // Return null or throw error based on desired handling
        return null;
    }
    // Ensure data and data.role exist before returning
    if (data?.role === 'admin' || data?.role === 'user') {
        return data.role;
    }
    return null;
}


/**
 * Get all teams a user has access to
 */
export async function getUserTeamAccess(userId: string): Promise<TeamAccess[]> {
    const { data, error } = await supabase
        .from('team_access')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user team access:', error);
        throw error;
    }

    return data || [];
}

/**
 * Check if a user has read access to a team
 */
export async function canReadTeam(userId: string, teamId: string): Promise<boolean> {
    const userRole = await getUserRole(userId);
    if (userRole === 'admin') return true;
    if (userRole === null) return false; // Error occurred fetching role

    // Check specific team access
    const { error, count } = await supabase
        .from('team_access')
        .select('can_read', { count: 'exact' })
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('can_read', true)
        .single(); // Check specifically for a record where can_read is true

    // If error other than 0 rows found, log it and deny access
    if (error && error.code !== 'PGRST116') { // PGRST116: Row not found
        console.error('Error checking team read access:', error);
        return false;
    }

    // If a row was found (count > 0), the user has read access
    return count !== null && count > 0;
}

/**
 * Check if a user has write access to a team
 */
export async function canWriteTeam(userId: string, teamId: string): Promise<boolean> {
    const userRole = await getUserRole(userId);
    if (userRole === 'admin') return true;
    if (userRole === null) return false;

    // Check specific team access
    const { error, count } = await supabase
        .from('team_access')
        .select('can_write', { count: 'exact' })
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('can_write', true)
        .single(); // Check specifically for a record where can_write is true

    if (error && error.code !== 'PGRST116') {
        console.error('Error checking team write access:', error);
        return false;
    }
    
    return count !== null && count > 0;
}

/**
 * Grant team access to a user
 */
export async function grantTeamAccess(
    userId: string,
    teamId: string,
    { canRead = true, canWrite = false }: { canRead?: boolean; canWrite?: boolean } = {}
): Promise<TeamAccess> {

    // Ensure canRead is true if canWrite is true
    if(canWrite) {
        canRead = true;
    }

    const { data, error } = await supabase
        .from('team_access')
        .upsert({
            user_id: userId,
            team_id: teamId,
            can_read: canRead,
            can_write: canWrite
        }, {
            onConflict: 'user_id, team_id' // Specify conflict columns for upsert
        })
        .select()
        .single();

    if (error) {
        console.error('Error granting team access:', error);
        throw error;
    }

    // --- Sync user_permissions table ---
    await supabase.from('user_permissions').upsert({
      user_id: userId,
      team_id: teamId,
      can_view_team: canRead,
      can_edit_team_details: canWrite,
      can_manage_employees: canWrite,
      can_manage_skills: canWrite,
    }, { onConflict: 'user_id, team_id' });

    // Upsert returns null data if no row was inserted/updated due to ignoreDuplicates/onConflict
    // If data is null, fetch the existing record
    if (!data) {
      const { data: existingData, error: fetchError } = await supabase
          .from('team_access')
          .select('*')
          .eq('user_id', userId)
          .eq('team_id', teamId)
          .single();
      if (fetchError) {
           console.error('Error fetching existing team access after upsert:', fetchError);
           throw fetchError;
      }
      if (!existingData) {
            // This case should ideally not happen after a successful upsert unless record deleted immediately after
            throw new Error("Failed to retrieve team access record after upsert.");
        }
        return existingData;
    }

    return data;
}

/**
 * Revoke team access from a user
 */
export async function revokeTeamAccess(userId: string, teamId: string): Promise<void> {
    const { error } = await supabase
        .from('team_access')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId);

    if (error) {
        console.error('Error revoking team access:', error);
        throw error; // Re-throw the error to indicate failure
    }

    // --- Remove from user_permissions table as well ---
    await supabase.from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);
} 