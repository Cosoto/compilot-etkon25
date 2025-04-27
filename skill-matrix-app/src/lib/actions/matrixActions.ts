'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database } from '@/lib/types/supabase';
import { unstable_noStore as noStore } from 'next/cache';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Types for data fetched by actions
type FetchedEmployee = Pick<Database['public']['Tables']['employees']['Row'], 'id' | 'first_name' | 'last_name' | 'team_id' | 'user_id'>;
type FetchedSkillRating = Pick<Database['public']['Tables']['employee_skills']['Row'], 'employee_id' | 'station_id' | 'rating'>;

// Type for the combined result of getTeamData
export type TeamData = {
    employees: FetchedEmployee[];
    skillRatings: FetchedSkillRating[];
};

/**
 * Server Action to fetch employees and their skill ratings for a specific team.
 */
export async function getTeamData(teamId: string): Promise<{ data: TeamData | null, error: string | null }> {
    noStore(); // Ensure fresh data is fetched
    const cookieStore = cookies();
    const supabase = createSupabaseServerClient(cookieStore as unknown as ReadonlyRequestCookies);

    if (!teamId) {
        return { data: null, error: "Team ID is required." };
    }

    try {
        // Fetch employees for the team
        const { data: employeesData, error: employeesError } = await supabase
            .from('employees')
            .select('id, first_name, last_name, team_id, user_id') // Select needed columns
            .eq('team_id', teamId);

        if (employeesError) {
            console.error(`ServerAction(getTeamData): Error fetching employees for team ${teamId}:`, employeesError.message);
            throw new Error(`Failed to fetch employees: ${employeesError.message}`);
        }

        const employees = employeesData || [];
        const employeeIds = employees.map(emp => emp.id);

        let skillRatings: FetchedSkillRating[] = [];
        // Only fetch ratings if there are employees
        if (employeeIds.length > 0) {
            const { data: ratingsData, error: ratingsError } = await supabase
                .from('employee_skills')
                .select('employee_id, station_id, rating') // Select needed columns
                .in('employee_id', employeeIds);

            if (ratingsError) {
                console.error(`ServerAction(getTeamData): Error fetching ratings for team ${teamId}:`, ratingsError.message);
                // Decide if this is fatal or just return partial data
                throw new Error(`Failed to fetch skill ratings: ${ratingsError.message}`);
            }
            skillRatings = ratingsData || [];
        }

        return { data: { employees, skillRatings }, error: null };

    } catch (err: unknown) {
        let errorMessage = 'Unknown error';
        if (err instanceof Error) {
            errorMessage = err.message;
        }
        console.error(`ServerAction(getTeamData): Unexpected error for team ${teamId}:`, errorMessage);
        return { data: null, error: errorMessage || "An unexpected error occurred while fetching team data." };
    }
}

/**
 * Server Action to update (upsert) an employee's skill rating.
 * If newRating is null, the rating will be deleted.
 */
export async function updateSkillRating(
    employeeId: string, 
    stationId: string, 
    rating: number | null
): Promise<{ success: boolean, error: string | null }> {
    noStore();
    const cookieStore = cookies();
    const supabase = createSupabaseServerClient(cookieStore as unknown as ReadonlyRequestCookies);

    try {
        // Get current user to set last_updated_by_user_id
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('ServerAction(updateSkillRating): User not authenticated.');
            return { success: false, error: 'Authentication required to update ratings.' };
        }

        if (rating === null) {
            // Delete the rating if it exists
            const { error: deleteError } = await supabase
                .from('employee_skills')
                .delete()
                .match({ employee_id: employeeId, station_id: stationId });

            if (deleteError) {
                console.error(`ServerAction(updateSkillRating): Error deleting rating for emp ${employeeId}, station ${stationId}:`, deleteError.message);
                throw new Error(`Database error: ${deleteError.message}`);
            }
        } else {
            // Upsert the new rating
            const { error: upsertError } = await supabase
                .from('employee_skills')
                .upsert({
                    employee_id: employeeId,
                    station_id: stationId,
                    rating: rating,
                    last_updated_by_user_id: user.id,
                }, {
                    onConflict: 'employee_id, station_id',
                });

            if (upsertError) {
                console.error(`ServerAction(updateSkillRating): Error upserting rating for emp ${employeeId}, station ${stationId}:`, upsertError.message);
                throw new Error(`Database error: ${upsertError.message}`);
            }
        }

        return { success: true, error: null };

    } catch (err: unknown) {
        let errorMessage = 'Unknown error';
        if (err instanceof Error) {
            errorMessage = err.message;
        }
        console.error(`ServerAction(updateSkillRating): Unexpected error for emp ${employeeId}, station ${stationId}:`, errorMessage);
        return { success: false, error: errorMessage || "An unexpected error occurred while saving the rating." };
    }
} 