'use client';

import React, { useMemo, useCallback } from 'react';

// Assuming types are defined similarly or imported
type Employee = {
    id: string;
    user_id: string | null;
    first_name: string;
    last_name: string;
    team_id: string | null;
};

type Station = {
    id: string;
    name: string;
};

type SkillRatingsMap = {
    [key: string]: number | null; // Key: "employeeId-stationId"
};

type StationsGapReportProps = {
    stations: Station[];
    employees: Employee[];
    skillRatings: SkillRatingsMap;
    stationTargets: { [stationId: string]: number };
    onTargetChange: (stationId: string, target: number) => void;
};

const TARGET_RATING = 3; // The minimum required rating to be considered skilled

const StationsGapReport: React.FC<StationsGapReportProps> = ({
    stations,
    employees,
    skillRatings,
    stationTargets,
    onTargetChange,
}) => {

    const stationSkillData = useMemo(() => {
        if (!stations || stations.length === 0 || !employees) { // Allow zero employees
            return [];
        }

        return stations.map(station => {
            let sufficientlySkilledCount = 0;
            (employees || []).forEach(employee => {
                const ratingKey = `${employee.id}-${station.id}`;
                const rating = skillRatings[ratingKey];

                // Only count valid ratings that meet or exceed the target
                if (rating !== undefined && rating !== null && rating >= TARGET_RATING) {
                    sufficientlySkilledCount++;
                }
            });

            const requiredTarget = stationTargets[station.id] ?? 0; // Get target or default to 0
            const actualGap = requiredTarget - sufficientlySkilledCount;

            return {
                id: station.id,
                name: station.name,
                requiredTarget: requiredTarget,
                sufficientlySkilledCount: sufficientlySkilledCount,
                actualGap: actualGap, // Positive value means a gap/shortfall
            };
        });
    }, [stations, employees, skillRatings, stationTargets]);

    const handleInputChange = useCallback((stationId: string, value: string) => {
        const target = parseInt(value, 10);
        // Update only if it's a valid non-negative number
        if (!isNaN(target) && target >= 0) {
            onTargetChange(stationId, target);
        } else if (value === '') {
             onTargetChange(stationId, 0); // Treat empty input as 0
        }
    }, [onTargetChange]);

    if (stationSkillData.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Stations Staffing Report (Target vs. Skilled Employees ≥ Rating {TARGET_RATING})
            </h2>
            {/* Simple Table Layout */}
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-4 py-2">Station</th>
                        <th scope="col" className="px-4 py-2 text-center">Target Needed</th>
                        <th scope="col" className="px-4 py-2 text-center">Currently Skilled</th>
                        <th scope="col" className="px-4 py-2 text-center">Gap / Surplus</th>
                        <th scope="col" className="px-4 py-2 text-center">Upskill Suggestions</th>
                    </tr>
                </thead>
                <tbody>
                    {stationSkillData.map(station => {
                        return (
                            <tr key={station.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 last:border-b-0">
                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {station.name}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <input
                                        type="number"
                                        min="0"
                                        value={station.requiredTarget}
                                        onChange={(e) => handleInputChange(station.id, e.target.value)}
                                        className="w-16 p-1 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 text-center"
                                        aria-label={`Target number of skilled employees for ${station.name}`}
                                    />
                                </td>
                                <td className="px-4 py-2 text-center font-medium">
                                    {station.sufficientlySkilledCount}
                                </td>
                                <td className={`px-4 py-2 text-center font-semibold ${
                                    station.actualGap > 0
                                        ? 'text-red-600 dark:text-red-400' // Gap exists
                                        : 'text-green-600 dark:text-green-400' // Target met or surplus
                                }`}>
                                    {station.actualGap > 0 ? `${station.actualGap} Short` : station.actualGap === 0 ? `Target Met` : `${Math.abs(station.actualGap)} Surplus`}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    {station.actualGap > 0 ? (
                                        (() => {
                                            // Group upskill candidates by level
                                            const level1 = (employees || []).filter(employee => {
                                                const ratingKey = `${employee.id}-${station.id}`;
                                                return skillRatings[ratingKey] === 1;
                                            });
                                            const level2 = (employees || []).filter(employee => {
                                                const ratingKey = `${employee.id}-${station.id}`;
                                                return skillRatings[ratingKey] === 2;
                                            });
                                            if (level1.length === 0 && level2.length === 0) {
                                                return <span className="text-xs text-gray-400">No candidates</span>;
                                            }
                                            return (
                                                <div className="flex gap-2 justify-center">
                                                    {level1.length > 0 && (
                                                        <div className="relative group">
                                                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold cursor-pointer" tabIndex={0} aria-label="Level 1 candidates">
                                                                L1: {level1.length}
                                                            </span>
                                                            <div className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 w-44 bg-white border rounded shadow-lg p-2 text-xs text-gray-900 opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus:pointer-events-auto">
                                                                {level1.map(emp => <div key={emp.id}>{emp.first_name || 'Unknown'} {emp.last_name || ''}</div>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {level2.length > 0 && (
                                                        <div className="relative group">
                                                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold cursor-pointer" tabIndex={0} aria-label="Level 2 candidates">
                                                                L2: {level2.length}
                                                            </span>
                                                            <div className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 w-44 bg-white border rounded shadow-lg p-2 text-xs text-gray-900 opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus:pointer-events-auto">
                                                                {level2.map(emp => <div key={emp.id}>{emp.first_name || 'Unknown'} {emp.last_name || ''}</div>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <span className="text-xs text-gray-400">-</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default StationsGapReport; 