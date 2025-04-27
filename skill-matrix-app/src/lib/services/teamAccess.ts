import { supabase } from '@/lib/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

export interface TeamAccess {
  id: string;
  user_id: string;
  team_id: string;
  can_read: boolean;
  can_write: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamAccessResponse {
  data: TeamAccess[] | null;
  error: PostgrestError | null;
}

export interface TeamAccessCheckResponse {
  hasAccess: boolean;
  error: PostgrestError | null;
}

/**
 * Checks if a user has access to a specific team at the given access level
 */
export const checkTeamAccess = async (
  userId: string,
  teamId: string,
  accessType: 'read' | 'write' = 'read'
): Promise<TeamAccessCheckResponse> => {
  try {
    const { data, error } = await supabase
      .from('team_access')
      .select('can_read, can_write')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (error) {
      return { hasAccess: false, error };
    }

    if (!data) {
      return { hasAccess: false, error: null };
    }

    return {
      hasAccess: accessType === 'read' ? data.can_read : data.can_write,
      error: null,
    };
  } catch (error) {
    return {
      hasAccess: false,
      error: error as PostgrestError,
    };
  }
};

/**
 * Grants access to a user for a specific team
 */
export const grantTeamAccess = async (
  userId: string,
  teamId: string,
  permissions: { canRead?: boolean; canWrite?: boolean }
): Promise<TeamAccessResponse> => {
  try {
    const { data: existing } = await supabase
      .from('team_access')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    const { data, error } = await supabase
      .from('team_access')
      .upsert(
        {
          user_id: userId,
          team_id: teamId,
          can_read: permissions.canRead ?? true,
          can_write: permissions.canWrite ?? false,
          ...(existing ? { id: existing.id } : {}),
        },
        { onConflict: 'user_id,team_id' }
      )
      .select();

    // Ensure all returned objects have 'updated_at' (null if missing)
    type MaybeWithUpdatedAt = { updated_at?: string } & Record<string, unknown>;
    const normalizedData = Array.isArray(data)
      ? data.map((item) => ({
          ...item,
          updated_at: typeof (item as MaybeWithUpdatedAt).updated_at === 'string'
            ? (item as MaybeWithUpdatedAt).updated_at ?? ''
            : ''
        }))
      : data;
    return { data: normalizedData, error };
  } catch (error) {
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
};

/**
 * Revokes access for a user from a specific team
 */
export const revokeTeamAccess = async (
  userId: string,
  teamId: string
): Promise<{ error: PostgrestError | null }> => {
  try {
    const { error } = await supabase
      .from('team_access')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    return { error };
  } catch (error) {
    return {
      error: error as PostgrestError,
    };
  }
};

/**
 * Gets all team access entries for a user
 */
export const getTeamAccess = async (
  userId: string
): Promise<TeamAccessResponse> => {
  try {
    const { data, error } = await supabase
      .from('team_access')
      .select('*')
      .eq('user_id', userId);

    // Ensure all returned objects have 'updated_at' (null if missing)
    type MaybeWithUpdatedAt = { updated_at?: string } & Record<string, unknown>;
    const normalizedData = Array.isArray(data)
      ? data.map((item) => ({
          ...item,
          updated_at: typeof (item as MaybeWithUpdatedAt).updated_at === 'string'
            ? (item as MaybeWithUpdatedAt).updated_at ?? ''
            : ''
        }))
      : data;
    return { data: normalizedData, error };
  } catch (error) {
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}; 