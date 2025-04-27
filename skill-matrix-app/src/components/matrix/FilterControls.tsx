import React from 'react';

// TODO: Define specific types from Supabase schema if possible
type Department = { id: string; name: string };
type ProductionLine = { id: string; name: string; department_id: string | null };
type Team = { id: string; name: string; production_line_id: string | null };
type AccessibleTeam = { team_id: string, can_write: boolean }; // From team_access table

type FilterControlsProps = {
    departments: Department[];
    productionLines: ProductionLine[];
    teams: Team[];
    selectedDepartmentId: string | null;
    selectedProductionLineId: string | null;
    selectedTeamId: string | null;
    onDepartmentChange: (id: string | null) => void;
    onProductionLineChange: (id: string | null) => void;
    onTeamChange: (id: string | null) => void;
    isAdmin: boolean;
    accessibleTeams?: AccessibleTeam[]; // Only relevant for non-admins
};

const FilterControls: React.FC<FilterControlsProps> = ({
    departments,
    productionLines,
    teams,
    selectedDepartmentId,
    selectedProductionLineId,
    selectedTeamId,
    onDepartmentChange,
    onProductionLineChange,
    onTeamChange,
    isAdmin,
    accessibleTeams = [], // Default to empty array
}) => {

    const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onDepartmentChange(e.target.value || null);
    };

    const handleProductionLineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onProductionLineChange(e.target.value || null);
    };

    const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onTeamChange(e.target.value || null);
    };

    // Filter options based on selections and permissions
    const availableProductionLines = productionLines.filter(pl =>
        !selectedDepartmentId || pl.department_id === selectedDepartmentId
    );

    const accessibleTeamIds = new Set(accessibleTeams.map(at => at.team_id));

    const availableTeams = teams.filter(team =>
        (!selectedProductionLineId || team.production_line_id === selectedProductionLineId) &&
        (isAdmin || accessibleTeamIds.has(team.id)) // Show only accessible teams for non-admins
    );

    // Determine if a non-admin user only has access to one specific team
    const singleTeamAccessId = (!isAdmin && accessibleTeams.length === 1) ? accessibleTeams[0].team_id : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow">
            {/* Department Selector */}
            <div>
                <label htmlFor="department-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                </label>
                <select
                    id="department-select"
                    value={selectedDepartmentId ?? ''}
                    onChange={handleDepartmentChange}
                    className="block w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
                    disabled={!isAdmin && accessibleTeams.length > 0} // Maybe disable if non-admin has specific team access?
                    aria-label="Select Department"
                >
                    <option value="">All Departments</option>
                    {departments.map(dep => (
                        <option key={dep.id} value={dep.id}>
                            {dep.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Production Line Selector */}
            <div>
                <label htmlFor="production-line-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Production Line
                </label>
                <select
                    id="production-line-select"
                    value={selectedProductionLineId ?? ''}
                    onChange={handleProductionLineChange}
                    className="block w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
                    disabled={(!isAdmin && accessibleTeams.length > 0) || availableProductionLines.length === 0} // Disable if no lines for department or non-admin
                    aria-label="Select Production Line"
                >
                    <option value="">All Production Lines</option>
                    {availableProductionLines.map(pl => (
                        <option key={pl.id} value={pl.id}>
                            {pl.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Team Selector */}
            <div>
                <label htmlFor="team-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Team
                </label>
                <select
                    id="team-select"
                    value={selectedTeamId ?? ''}
                    onChange={handleTeamChange}
                    className="block w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
                    disabled={!!singleTeamAccessId || availableTeams.length === 0} // Disable if non-admin has only 1 team or no teams available
                    aria-label="Select Team"
                >
                    <option value="">Select a Team</option>
                     {availableTeams.map(team => (
                        <option key={team.id} value={team.id}>
                            {team.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default FilterControls; 