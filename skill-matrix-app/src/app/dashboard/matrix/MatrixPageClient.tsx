'use client'; // Need client component for state

import React, { useState, useCallback, useEffect } from 'react';
import FilterControlsWrapper from '@/components/matrix/FilterControlsWrapper';
import MatrixTableWrapper from '@/components/matrix/MatrixTableWrapper';
import { getTeamData, type TeamData } from '@/lib/actions/matrixActions'; // Use server action for correct RLS
import { startTransition } from 'react'; // Import startTransition
import { supabase } from '@/lib/supabase/client';

// Re-import types needed for props passed to wrappers
type Department = { id: string; name: string };
type ProductionLine = { id: string; name: string; department_id: string | null };
type Team = { id: string; name: string; production_line_id: string | null };
type Station = { id: string; name: string; department_id: string | null };
type AccessibleTeam = { team_id: string, can_write: boolean };

// Props received from the RSC parent
interface MatrixPageClientProps {
    initialDepartments: Department[];
    initialProductionLines: ProductionLine[];
    initialTeams: Team[];
    initialStations: Station[];
    isAdmin: boolean;
    initialAccessibleTeams: AccessibleTeam[];
    userId: string | null;
    fetchError: string | null; // Pass initial fetch error from server
}

// This component wraps the Filter and Table, managing the shared state
const MatrixPageClient: React.FC<MatrixPageClientProps> = ({
    initialDepartments,
    initialProductionLines,
    initialTeams,
    initialStations,
    isAdmin,
    initialAccessibleTeams,
    userId,
    fetchError: initialFetchError
}) => {

    const [teamData, setTeamData] = useState<TeamData | null>(null);
    const [isLoadingTeamData, setIsLoadingTeamData] = useState<boolean>(false);
    const [fetchTeamDataError, setFetchTeamDataError] = useState<string | null>(null);
    // State to track if initial auto-fetch has been attempted
    const [initialFetchDone, setInitialFetchDone] = useState<boolean>(false);
    // Rename state to track selected department ID
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

    // Helper function to get department ID for a team
    const getDepartmentIdForTeam = useCallback((teamId: string) => {
        const team = initialTeams.find(t => t.id === teamId);
        if (!team) return null;
        
        const productionLine = initialProductionLines.find(pl => pl.id === team.production_line_id);
        return productionLine?.department_id || null;
    }, [initialTeams, initialProductionLines]);

    // Update callback signature and logic
    const handleTeamDataFetched = useCallback((data: TeamData | null, isLoading: boolean, error: string | null, departmentId: string | null) => {
        setTeamData(data);
        setIsLoadingTeamData(isLoading);
        setFetchTeamDataError(error);
        setSelectedDepartmentId(departmentId);
        if (data || error) {
            setInitialFetchDone(true);
        }
    }, []);

    // Refresh team data when ratings change
    const refreshTeamData = useCallback(async (teamId: string) => {
        setIsLoadingTeamData(true);
        setFetchTeamDataError(null);
        const { data, error } = await getTeamData(teamId);
        if (error) {
            setFetchTeamDataError(error);
            setTeamData(null);
        } else {
            setTeamData(data);
            setFetchTeamDataError(null);
        }
        setIsLoadingTeamData(false);
    }, []);

    // Set up real-time subscription for rating changes
    useEffect(() => {
        if (!teamData?.employees?.[0]?.team_id) return;

        const teamId = teamData.employees[0].team_id;

        const channel = supabase.channel('matrix-ratings')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'employee_skills',
                    filter: `team_id=eq.${teamId}`
                },
                () => {
                    refreshTeamData(teamId);
                }
            )
            .subscribe(() => {
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [teamData, refreshTeamData]);

    // --- Auto-fetch logic for single-team users ---
    useEffect(() => {
        // Only run if user is not admin, has exactly one team, and initial fetch hasn't happened
        if (!isAdmin && initialAccessibleTeams.length === 1 && !initialFetchDone) {
            const singleTeamId = initialAccessibleTeams[0].team_id;
            const departmentId = getDepartmentIdForTeam(singleTeamId);

            // Set loading state immediately
            setIsLoadingTeamData(true);
            setFetchTeamDataError(null);
            setInitialFetchDone(true);
            setSelectedDepartmentId(departmentId); // Set department ID immediately

            // Use startTransition for the async action call
            startTransition(async () => {
                const { data, error } = await getTeamData(singleTeamId);
                if (error) {
                    setFetchTeamDataError(error);
                    setTeamData(null);
                } else {
                    setTeamData(data);
                    setFetchTeamDataError(null);
                }
                setIsLoadingTeamData(false);
            });
        }
        // If user is admin or has multiple teams, mark initial fetch as done
        else if (isAdmin || initialAccessibleTeams.length !== 1) {
            setInitialFetchDone(true);
        }
    }, [isAdmin, initialAccessibleTeams, initialFetchDone, getDepartmentIdForTeam]);

    return (
        <div className="space-y-6">
            {initialFetchError && <div className="p-2 text-orange-600 bg-orange-100 border border-orange-300 rounded">Warning: {initialFetchError}</div>}

            <FilterControlsWrapper
                initialDepartments={initialDepartments}
                initialProductionLines={initialProductionLines}
                initialTeams={initialTeams}
                isAdmin={isAdmin}
                initialAccessibleTeams={initialAccessibleTeams}
                onTeamDataFetched={handleTeamDataFetched}
            />

            <MatrixTableWrapper
                initialStations={initialStations}
                isAdmin={isAdmin}
                userId={userId}
                teamData={teamData}
                isLoading={isLoadingTeamData}
                error={fetchTeamDataError}
                initialAccessibleTeams={initialAccessibleTeams}
                selectedDepartmentId={selectedDepartmentId}
            />
        </div>
    );
};

export default MatrixPageClient; 