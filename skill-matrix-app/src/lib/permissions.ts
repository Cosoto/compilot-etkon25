// This file contains the OLD permission logic based on the `user_permissions` table.
// It is being replaced by the `team_access` table and helpers in `teamAccess.ts`.
// Keeping the file for reference temporarily, but its functions should no longer be used.
/*
import { supabase } from './supabase';

// Define generic resource types and actions
export type ResourceType = 'departments' | 'production_lines' | 'teams' | 'employees' | 'users' | 'skills' | 'station_skills';
export type Action = 'create' | 'read' | 'update' | 'delete';

// Define the new generic permission structure
export type UserPermission = {
  resource_type: ResourceType;
  action: Action;
};

// Define the old team-centric permission structure (might still be used elsewhere or can be removed later)
export type TeamUserPermission = {
  id?: string;
  user_id: string;
  team_id: string;
  can_view_team: boolean;
  can_edit_team_details: boolean;
  can_manage_employees: boolean;
  can_manage_skills: boolean;
};

// Define the possible team-specific actions (might be deprecated)
export type TeamPermissionAction = 'view_team' | 'edit_team_details' | 'manage_employees' | 'manage_skills';

// Resource types relevant for admin full access
const ALL_RESOURCE_TYPES: ResourceType[] = ['departments', 'production_lines', 'teams', 'employees', 'users', 'skills', 'station_skills'];
const ALL_ACTIONS: Action[] = ['create', 'read', 'update', 'delete'];

// Fetch user permissions (returns NEW UserPermission array)
export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  try {
    // Check user role
    console.log('(permissions.ts - OLD) Fetching user role for:', userId);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('(permissions.ts - OLD) Full user data from database:', userData);
    console.log('(permissions.ts - OLD) Supabase query error (fetching user):', userError);

    if (userError && userError.code !== 'PGRST116') { 
      console.error('(permissions.ts - OLD) Error fetching user data:', userError);
      return []; 
    }
    if (!userData) {
      console.warn(`(permissions.ts - OLD) User with ID ${userId} not found.`);
    }

    if (userData?.role === 'admin') { 
      console.log('(permissions.ts - OLD) User is admin, granting full CRUD permissions...');
      const adminPermissions: UserPermission[] = [];
      for (const resource_type of ALL_RESOURCE_TYPES) {
        for (const action of ALL_ACTIONS) {
          adminPermissions.push({ resource_type, action });
        }
      }
      return adminPermissions;
    } 
    
    console.log('(permissions.ts - OLD) User is not admin, fetching specific permissions from user_permissions...');

    const { data: specificPermissionsData, error: specificPermissionsError } = await supabase
      .from('user_permissions') // <<< QUERIES OLD TABLE
      .select('team_id, can_view_team, can_edit_team_details, can_manage_employees, can_manage_skills') 
      .eq('user_id', userId);

    if (specificPermissionsError) {
      console.error('(permissions.ts - OLD) Error fetching specific user permissions:', specificPermissionsError);
      return []; 
    }

    if (!specificPermissionsData || specificPermissionsData.length === 0) {
        console.log('(permissions.ts - OLD) No specific permissions found for user:', userId);
        return [];
    }

    console.log('(permissions.ts - OLD) Fetched specific permissions records:', specificPermissionsData);

    // Translate team-centric permissions to generic format
    const mappedPermissions: UserPermission[] = [];
    specificPermissionsData.forEach(permission => {
      if (permission.can_view_team) {
        mappedPermissions.push({ resource_type: 'teams', action: 'read' });
      }
      // ... (mapping for other old flags)
    });

    return mappedPermissions;

  } catch (err) {
    console.error('(permissions.ts - OLD) Exception in getUserPermissions:', err);
    return [];
  }
}

// Check if user has a specific permission (NEW IMPLEMENTATION using mapped permissions)
export function hasPermission(
  permissions: UserPermission[], 
  resourceType: ResourceType, 
  action: Action
): boolean {
  // ... (implementation based on the mapped array)
  return false; // Placeholder
}
*/ 