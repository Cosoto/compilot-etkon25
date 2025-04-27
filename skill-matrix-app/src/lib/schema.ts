export type Category = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Department = {
  id: string;
  name: string;
  created_at: string;
};

export type EmployeeSkill = {
  id: string;
  user_id: string;
  station_id: string;
  rating: number;
  created_at: string;
};

export type ProductionLine = {
  id: string;
  name: string;
  department_id: string;
  created_at: string;
};

export type Skill = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  created_at: string;
  updated_at: string;
};

export type Station = {
  id: string;
  name: string;
  department_id: string;
  created_at: string;
  updated_at: string;
};

export type UserTeam = {
  user_id: string;
  team_id: string;
};

export type User = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  role: 'Operator' | 'Trainer' | 'Hancho' | 'Teamleader';
  contract_type: 'Permanent' | 'Temporary';
  team_id: string;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  production_line_id: string;
  created_at: string;
  updated_at: string;
};

export type TeamAccess = {
  id: string;
  user_id: string;
  team_id: string;
  can_read: boolean;
  can_write: boolean;
  created_at: string;
};

// Database schema documentation
export const schema = {
  categories: {
    table: 'categories',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      name: 'text NOT NULL',
      description: 'text',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
      updated_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  departments: {
    table: 'departments',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      name: 'text NOT NULL',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  employee_skills: {
    table: 'employee_skills',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      user_id: 'uuid REFERENCES auth.users(id) ON DELETE CASCADE',
      station_id: 'uuid REFERENCES stations(id) ON DELETE CASCADE',
      rating: 'integer CHECK (rating >= 0 AND rating <= 5)',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  production_lines: {
    table: 'production_lines',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      name: 'text NOT NULL',
      department_id: 'uuid REFERENCES departments(id) ON DELETE CASCADE',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  skills: {
    table: 'skills',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      name: 'text NOT NULL',
      description: 'text',
      category_id: 'uuid REFERENCES categories(id)',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
      updated_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  stations: {
    table: 'stations',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      name: 'text NOT NULL',
      department_id: 'uuid REFERENCES departments(id) ON DELETE CASCADE',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
      updated_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  user_teams: {
    table: 'user_teams',
    columns: {
      user_id: 'uuid REFERENCES auth.users(id) ON DELETE CASCADE',
      team_id: 'uuid REFERENCES teams(id) ON DELETE CASCADE',
      PRIMARY_KEY: '(user_id, team_id)',
    },
  },
  users: {
    table: 'users',
    columns: {
      id: 'uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE',
      email: 'text NOT NULL',
      role: 'text NOT NULL CHECK (role IN (\'admin\', \'user\'))',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
      updated_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  employees: {
    table: 'employees',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      first_name: 'text NOT NULL',
      last_name: 'text NOT NULL',
      role: 'text NOT NULL CHECK (role IN (\'Operator\', \'Trainer\', \'Hancho\', \'Teamleader\'))',
      contract_type: 'text NOT NULL CHECK (contract_type IN (\'Permanent\', \'Temporary\'))',
      team_id: 'uuid REFERENCES teams(id) ON DELETE CASCADE',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
      updated_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  teams: {
    table: 'teams',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      name: 'text NOT NULL',
      department_id: 'uuid REFERENCES departments(id) ON DELETE CASCADE',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
      updated_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
  team_access: {
    table: 'team_access',
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()',
      user_id: 'uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE',
      team_id: 'uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE',
      can_read: 'boolean NOT NULL DEFAULT true',
      can_write: 'boolean NOT NULL DEFAULT false',
      created_at: 'timestamp with time zone NOT NULL DEFAULT timezone(\'utc\'::text, now())',
    },
  },
};

/**
 * Database Schema
 * 
 * Tables:
 * 1. user_permissions
 *    - id: UUID (PK)
 *    - user_id: UUID (FK -> auth.users)
 *    - team_id: UUID (FK -> teams)
 *    - can_view: boolean
 *    - can_edit: boolean
 *    - created_at: timestamptz
 *    - updated_at: timestamptz
 *    - UNIQUE(user_id, team_id)
 * 
 * Indexes:
 * - idx_user_permissions_user_id (user_id)
 * - idx_user_permissions_team_id (team_id)
 * 
 * RLS Policies:
 * - Users can view their own permissions
 * - Admin users can manage all permissions
 * 
 * Table: teams
 * - id: uuid (primary key)
 * - name: text (not null)
 * - department_id: uuid (foreign key to departments.id)
 * - created_at: timestamp with time zone (default: now())
 * - updated_at: timestamp with time zone (default: now())
 * 
 * Constraints:
 * - Primary key on id
 * - Foreign key on department_id referencing departments.id
 * - Unique constraint on (name, department_id)
 * 
 * Indexes:
 * - On department_id
 * 
 * RLS Policies:
 * - Users can view teams they have permission for
 * - Admin users can manage all teams
 */ 