'use client';

import React, { useState, useMemo, useCallback, startTransition } from 'react';
import FilterControls from '@/components/matrix/FilterControls'; // The original presentation component
import { getTeamData, type TeamData } from '@/lib/actions/matrixActions';
import { Loader2 } from 'lucide-react';

// Types matching the props passed from the RSC
type Department = { id: string; name: string };
type ProductionLine = { id: string; name: string; department_id: string | null };
type Team = { id: string; name: string; production_line_id: string | null };
type AccessibleTeam = { team_id: string, can_write: boolean };

// Props for the wrapper
type FilterControlsWrapperProps = {
    initialDepartments: Department[];
    initialProductionLines: ProductionLine[];
    initialTeams: Team[];
    isAdmin: boolean;
    initialAccessibleTeams: AccessibleTeam[];
    onTeamDataFetched: (data: TeamData | null, isLoading: boolean, error: string | null, departmentId: string | null) => void;
};

const FilterControlsWrapper: React.FC<FilterControlsWrapperProps> = ({
    initialDepartments,
    initialProductionLines,
    initialTeams,
    isAdmin,
    initialAccessibleTeams,
    onTeamDataFetched
}) => {
    // State for selected filters
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
    const [selectedProductionLineId, setSelectedProductionLineId] = useState<string | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    // State for loading/error during Server Action call
    const [isFetchingTeamData, setIsFetchingTeamData] = useState<boolean>(false);
    const [fetchTeamDataError, setFetchTeamDataError] = useState<string | null>(null);

    // Memoized filtering logic (similar to original MatrixPage)
    const availableProductionLines = useMemo(() => {
        if (!selectedDepartmentId) return initialProductionLines;
        const filteredLines = initialProductionLines.filter(pl => pl.department_id === selectedDepartmentId);
        return filteredLines;
    }, [selectedDepartmentId, initialProductionLines]);

    const accessibleTeamIds = useMemo(() => new Set(initialAccessibleTeams.map(at => at.team_id)), [initialAccessibleTeams]);

    const availableTeams = useMemo(() => {
        return initialTeams.filter(team =>
            (!selectedProductionLineId || team.production_line_id === selectedProductionLineId) &&
            (isAdmin || accessibleTeamIds.has(team.id))
        );
    }, [selectedProductionLineId, initialTeams, isAdmin, accessibleTeamIds]);

    // --- Handlers ---
    const handleDepartmentChange = useCallback((id: string | null) => {
        setSelectedDepartmentId(id);
        setSelectedProductionLineId(null);
        setSelectedTeamId(null);
        onTeamDataFetched(null, false, null, id);
    }, [onTeamDataFetched]);

    const handleProductionLineChange = useCallback((id: string | null) => {
        setSelectedProductionLineId(id);
        setSelectedTeamId(null);
        const line = initialProductionLines.find(pl => pl.id === id);
        const deptId = line?.department_id ?? selectedDepartmentId;
        onTeamDataFetched(null, false, null, deptId);
    }, [onTeamDataFetched, initialProductionLines, selectedDepartmentId]);

    const handleTeamChange = useCallback(async (teamId: string | null) => {
        setSelectedTeamId(teamId);
        setFetchTeamDataError(null);

        let associatedDepartmentId: string | null = null;
        if (teamId) {
            const team = initialTeams.find(t => t.id === teamId);
            const prodLineId = team?.production_line_id;
            if (prodLineId) {
                const prodLine = initialProductionLines.find(pl => pl.id === prodLineId);
                associatedDepartmentId = prodLine?.department_id ?? null;
            }
            if (!associatedDepartmentId) {
                 associatedDepartmentId = selectedDepartmentId;
            }
        } else {
             associatedDepartmentId = selectedDepartmentId;
        }

        if (!teamId) {
            onTeamDataFetched(null, false, null, associatedDepartmentId);
            return;
        }

        setIsFetchingTeamData(true);
        onTeamDataFetched(null, true, null, associatedDepartmentId);

        startTransition(async () => {
            const { data, error } = await getTeamData(teamId);
            if (error) {
                setFetchTeamDataError(error);
                onTeamDataFetched(null, false, error, associatedDepartmentId);
            } else {
                onTeamDataFetched(data, false, null, associatedDepartmentId);
            }
            setIsFetchingTeamData(false);
        });

    }, [onTeamDataFetched, initialTeams, initialProductionLines, selectedDepartmentId]);

    return (
        <div>
            <FilterControls
                departments={initialDepartments}
                productionLines={availableProductionLines}
                teams={availableTeams}
                selectedDepartmentId={selectedDepartmentId}
                selectedProductionLineId={selectedProductionLineId}
                selectedTeamId={selectedTeamId}
                onDepartmentChange={handleDepartmentChange}
                onProductionLineChange={handleProductionLineChange}
                onTeamChange={handleTeamChange}
                isAdmin={isAdmin}
                accessibleTeams={initialAccessibleTeams}
            />
             {isFetchingTeamData && (
                 <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading team data...</span>
                 </div>
             )}
             {fetchTeamDataError && (
                 <p className="text-red-600 p-2">Error loading team data: {fetchTeamDataError}</p>
             )}
        </div>
    );
};

export default FilterControlsWrapper; 