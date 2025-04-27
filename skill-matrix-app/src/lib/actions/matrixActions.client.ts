import { supabase } from '@/lib/supabase/client';

export type FetchedEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string;
  user_id: string;
};

export type FetchedSkillRating = {
  employee_id: string;
  station_id: string;
  rating: number;
};

export type TeamData = {
  employees: FetchedEmployee[];
  skillRatings: FetchedSkillRating[];
};

export const getTeamDataClient = async (
  teamId: string
): Promise<{ data: TeamData | null; error: string | null }> => {
  if (!teamId) {
    return { data: null, error: 'Team ID is required.' };
  }
  try {
    // Fetch employees for the team
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, team_id, user_id')
      .eq('team_id', teamId);

    if (employeesError) {
      return { data: null, error: `Failed to fetch employees: ${employeesError.message}` };
    }
    // Filter out any employees with null user_id (shouldn't happen, but for type safety)
    const employees = (employeesData || []).filter(
      (emp): emp is FetchedEmployee =>
        emp.id !== null && emp.first_name !== null && emp.last_name !== null && emp.team_id !== null && emp.user_id !== null
    );
    const employeeIds = employees.map((emp) => emp.id);
    let skillRatings: FetchedSkillRating[] = [];
    if (employeeIds.length > 0) {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('employee_skills')
        .select('employee_id, station_id, rating')
        .in('employee_id', employeeIds);
      if (ratingsError) {
        return { data: null, error: `Failed to fetch skill ratings: ${ratingsError.message}` };
      }
      // Filter out any ratings with null fields
      skillRatings = (ratingsData || []).filter(
        (r): r is FetchedSkillRating =>
          r.employee_id !== null && r.station_id !== null && typeof r.rating === 'number'
      );
    }
    return { data: { employees, skillRatings }, error: null };
  } catch (err: unknown) {
    let errorMessage = 'Unknown error';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return { data: null, error: errorMessage || 'An unexpected error occurred while fetching team data.' };
  }
}; 