'use client';

import React, { useState, useMemo, useCallback, startTransition } from 'react';
import MatrixTable from '@/components/matrix/MatrixTable'; // The original presentation component
import { updateSkillRating } from '@/lib/actions/matrixActions'; // Import the Server Action
import { Loader2 } from 'lucide-react';

// Types matching props from RSC & Fetched data
type Station = { id: string; name: string; department_id: string | null }; // From RSC
// Corrected SkillRating to allow nulls, matching FetchedSkillRating from action
type SkillRating = { employee_id: string | null; station_id: string | null; rating: number | null };

// Type for the data received from FilterControlsWrapper
import type { TeamData } from '@/lib/actions/matrixActions';

type MatrixTableWrapperProps = {
    initialStations: Station[];
    isAdmin: boolean;
    userId: string | null; // Needed for update action check, maybe
    // Props received from parent state or via callback
    teamData: TeamData | null;
    isLoading: boolean;
    error: string | null;
    // Add initialAccessibleTeams prop
    initialAccessibleTeams: { team_id: string; can_write: boolean; }[];
    // Add selectedDepartmentId prop
    selectedDepartmentId: string | null;
};

// Helper to transform fetched ratings into the map format expected by MatrixTable
const createSkillRatingsMap = (ratings: SkillRating[]): { [key: string]: number | null } => {
    const map: { [key: string]: number | null } = {};
    (ratings || []).forEach(rating => {
        // Only create map entry if employee_id and station_id exist
        if (rating.employee_id && rating.station_id) {
            map[`${rating.employee_id}-${rating.station_id}`] = rating.rating;
        }
    });
    return map;
};

const MatrixTableWrapper: React.FC<MatrixTableWrapperProps> = ({
    initialStations,
    isAdmin,
    userId,
    teamData,
    isLoading,
    error,
    initialAccessibleTeams,
    selectedDepartmentId
}) => {

    // State for managing optimistic updates and saving state
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    // Local state for ratings to allow optimistic updates
    const [optimisticRatings, setOptimisticRatings] = useState<{ [key: string]: number | null }>({});

    // Process fetched data when it arrives
    const employees = useMemo(() => teamData?.employees || [], [teamData]);
    const skillRatingsMap = useMemo(() => {
        const fetchedMap = createSkillRatingsMap(teamData?.skillRatings || []);
        // Merge optimistic updates onto the fetched map
        return { ...fetchedMap, ...optimisticRatings };
    }, [teamData, optimisticRatings]);

    // Get the department ID for the current team
    const currentTeamDepartmentId = useMemo(() => {
        if (!teamData?.employees?.[0]?.team_id) return null;
        
        // For non-admin users with exactly one accessible team
        if (!isAdmin && initialAccessibleTeams.length === 1) {
            // This is your team's department ID - it should be used automatically
            return selectedDepartmentId;
        }
        
        return selectedDepartmentId;
    }, [teamData, isAdmin, initialAccessibleTeams, selectedDepartmentId]);

    // Updated filtering logic
    const filteredStations = useMemo(() => {
        const departmentId = currentTeamDepartmentId;
        
        // For non-admin users with a single team, always show their department's stations
        if (!isAdmin && initialAccessibleTeams.length === 1) {
            return initialStations.filter(station => station.department_id === departmentId);
        }
        
        // For admin users or users with multiple teams, require department selection
        if (departmentId) {
            return initialStations.filter(station => station.department_id === departmentId);
        }
        
        // If no department is selected for admin/multi-team users, show no stations
        return [];
    }, [initialStations, currentTeamDepartmentId, isAdmin, initialAccessibleTeams]);

    // Determine if the user can write to the current team
    const canWriteToCurrentTeam = useMemo(() => {
        if (isAdmin) return true; // Admins can always write
        if (!teamData?.employees?.[0]?.team_id) return false; // No team data yet
        
        // Find the team access entry for the current team
        const currentTeamAccess = initialAccessibleTeams.find(
            access => access.team_id === teamData.employees[0].team_id
        );
        
        return currentTeamAccess?.can_write || false;
    }, [isAdmin, teamData, initialAccessibleTeams]);

    // Handler for rating change - calls Server Action
    const handleRatingChange = useCallback(async (employeeId: string, stationId: string, newRating: number | null) => {
        if (!userId) {
            setSaveError("Login required to save ratings.");
            return;
        }
        if (!canWriteToCurrentTeam) {
            setSaveError("You don't have permission to modify ratings for this team.");
            return;
        }
        setSaveError(null);

        const ratingKey = `${employeeId}-${stationId}`;
        const oldRating = skillRatingsMap[ratingKey];

        // Optimistic update
        if (newRating === null) {
            // If setting to null (unrated), remove from optimistic updates
            setOptimisticRatings(prev => {
                const newState = { ...prev };
                delete newState[ratingKey];
                return newState;
            });
        } else {
            // Otherwise update with new rating
            setOptimisticRatings(prev => ({ ...prev, [ratingKey]: newRating }));
        }
        
        setIsSaving(true);

        startTransition(async () => {
            const { success, error: actionError } = await updateSkillRating(employeeId, stationId, newRating);
            if (!success) {
                console.error("Failed to save rating:", actionError);
                setSaveError(actionError || "Failed to save rating.");
                // Revert optimistic update on failure
                setOptimisticRatings(prev => {
                    const newState = { ...prev };
                    if (oldRating === undefined) {
                        delete newState[ratingKey];
                    } else {
                        newState[ratingKey] = oldRating;
                    }
                    return newState;
                });
            } else {
                setSaveError(null);
            }
            setIsSaving(false);
        });
    }, [userId, skillRatingsMap, canWriteToCurrentTeam]);

    // --- Render Logic ---
    if (isLoading) {
        // Loading state is handled by FilterControlsWrapper mostly
        // But we can show a message here if needed
        return <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /><span className="ml-2">Loading team data...</span></div>;
    }

    if (error) {
        // Error state handled by FilterControlsWrapper
        // But we can show a more prominent error here
        return <p className="text-red-600 p-4 text-center">Error loading team data: {error}</p>;
    }

    if (!teamData && !isLoading) {
        // No team selected or initial state
        return <p className="text-gray-500 dark:text-gray-400 italic p-4 text-center">Select a team to view the matrix.</p>;
    }

    // Handle case where teamData exists but has no employees
    if (teamData && teamData.employees.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 italic p-4 text-center">No employees found for the selected team.</p>;
    }

    // Only render the table if we have teamData and employees
    if (teamData && teamData.employees.length > 0) {
        return (
            <div className="relative">
                {isSaving && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-50">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2">Saving...</span>
                    </div>
                )}
                {saveError && (
                     <p className="text-red-600 p-2 text-sm">Error saving: {saveError}</p>
                )}
                <MatrixTable
                    employees={employees}
                    stations={filteredStations}
                    skillRatings={skillRatingsMap}
                    onRatingChange={canWriteToCurrentTeam ? handleRatingChange : undefined} // Only pass handler if user can write
                />
            </div>
        );
    }

    // Fallback if none of the above conditions are met (shouldn't happen ideally)
    return null;
};

// This component needs state lifted up to coordinate between Filter and Table
// A parent component or context/store (like Zustand) is needed.
// For now, this structure assumes a parent component manages the state (`teamData`, `isLoading`, `error`)
// and passes `onTeamDataFetched` to FilterControlsWrapper and the state props to MatrixTableWrapper.

export default MatrixTableWrapper; 