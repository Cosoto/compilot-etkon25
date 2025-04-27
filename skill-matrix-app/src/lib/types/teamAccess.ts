export interface TeamAccess {
  id: string;
  user_id: string;
  team_id: string;
  can_read: boolean;
  can_write: boolean;
  created_at: string;
  updated_at: string;
}

export type AccessLevel = 'read' | 'write';

export interface TeamAccessResponse {
  data: TeamAccess[] | null;
  error: Error | null;
}

export interface TeamAccessCheck {
  hasAccess: boolean;
  error: Error | null;
} 