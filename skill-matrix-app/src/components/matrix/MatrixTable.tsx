import React from 'react';
import RatingCell from './RatingCell';

// Keep existing type definitions here for now
type Employee = {
    id: string;
    user_id: string | null;
    first_name: string;
    last_name: string;
    team_id: string;
};

type Station = {
    id: string;
    name: string;
};

type SkillRatingsMap = {
    [key: string]: number | null;
};

type MatrixTableProps = {
    employees: Employee[];
    stations: Station[];
    skillRatings: SkillRatingsMap;
    onRatingChange?: (employeeId: string, stationId: string, newRating: number | null) => Promise<void>;
};

const MatrixTable: React.FC<MatrixTableProps> = ({
    employees,
    stations,
    skillRatings,
    onRatingChange,
}) => {
    if (!employees || employees.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 italic p-4">No employees found for the selected team.</p>;
    }

    if (!stations || stations.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 italic p-4">No stations found for the selected criteria.</p>;
    }

    return (
        <div className="overflow-auto shadow-md rounded-lg relative h-full">
            <table className="min-w-full w-full border-collapse divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-20">
                    <tr>
                        <th scope="col"
                            className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                            Employee
                        </th>
                        {stations.map(station => (
                            <th key={station.id}
                                scope="col"
                                className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                {station.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 group/tbody">
                    {employees.map((employee) => {
                        const employeeId = employee.id;
                        // A cell is editable if onRatingChange is provided (which means user has write access)
                        const canEdit = !!onRatingChange;

                        return (
                            <tr key={employee.id} className="group/row hover:bg-sky-50 dark:hover:bg-sky-950/50">
                                <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 group-hover/row:bg-sky-50 dark:group-hover/row:bg-sky-950/50 px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                    {employee.first_name} {employee.last_name}
                                </td>
                                {stations.map((station) => {
                                    const ratingKey = `${employeeId}-${station.id}`;
                                    const currentRating = skillRatings[ratingKey];

                                    return (
                                        <td key={station.id}
                                            className="group/cell px-1 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                            <div className="group-hover/row:bg-sky-50 dark:group-hover/row:bg-sky-950/50">
                                                <RatingCell
                                                    employeeId={employeeId}
                                                    stationId={station.id}
                                                    currentRating={currentRating}
                                                    isEditable={canEdit}
                                                    onRatingChange={onRatingChange}
                                                />
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default MatrixTable; 