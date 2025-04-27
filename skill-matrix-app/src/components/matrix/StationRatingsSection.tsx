import React, { useState, useEffect, useRef } from 'react';
import { StationRatingsChart } from './StationRatingsChart';
import { supabase } from '@/lib/supabase/client';

interface ChartRatingData {
  department: string;
  productionLine: string;
  team: string;
  station: string;
  averageRating: number;
  ratingCount: number;
}

interface StationRatingsSectionProps {
  allDepartments: { id: string; name: string }[];
  allProductionLines: { id: string; name: string; department_id: string | null }[];
  allTeams: { id: string; name: string; production_line_id: string | null; department_id: string | null }[];
  isAdmin: boolean;
  userTeamName?: string;
}

const skeletonBars = Array.from({ length: 8 });

// Define ChartRatingMap type
interface ChartRatingMapValue {
  department: string;
  productionLine: string;
  team: string;
  station: string;
  totalRating: number;
  count: number;
}

export const StationRatingsSection: React.FC<StationRatingsSectionProps> = ({
  allDepartments,
  allProductionLines,
  allTeams,
  isAdmin,
  userTeamName,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedProductionLine, setSelectedProductionLine] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [data, setData] = useState<ChartRatingData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(true);
  const fadeTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fade out chart and load new data on filter change
  useEffect(() => {
    // Fade out chart
    setShowChart(false);
    // Wait for fade-out before loading
    if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    fadeTimeout.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      // Fetch data
      const fetchData = async () => {
        try {
          const { data: allEmployeesForSkills, error: allEmpError } = await supabase
            .from('employees')
            .select('id, teams(id, name, production_lines(id, name, department_id))');
          if (allEmpError) throw allEmpError;
          if (!allEmployeesForSkills) throw new Error('Failed to fetch all employees for skills');
          const allEmployeeIds = allEmployeesForSkills.map(emp => emp.id);
          const employeeIdToDeptIdMap: Record<string, string | null> = {};
          const employeeIdToProdLineNameMap: Record<string, string> = {};
          const employeeIdToTeamNameMap: Record<string, string> = {};
          (allEmployeesForSkills as unknown[]).forEach((emp) => {
            if (typeof emp !== 'object' || emp === null) return;
            const e = emp as { id: string; teams?: { name?: string; production_lines?: { name?: string; department_id?: string | null } } };
            const team = e.teams;
            const prodLine = team?.production_lines;
            employeeIdToDeptIdMap[e.id] = prodLine?.department_id ?? null;
            if (prodLine?.name) {
              employeeIdToProdLineNameMap[e.id] = prodLine.name;
            }
            if (team?.name) {
              employeeIdToTeamNameMap[e.id] = team.name;
            }
          });
          if (allEmployeeIds.length === 0) {
            setData([]);
            setLoading(false);
            setTimeout(() => setShowChart(true), 50); // fade in empty chart
            return;
          }
          const { data: chartStationsData, error: chartStationsError } = await supabase
            .from('stations')
            .select('id, name, department_id');
          if (chartStationsError) throw chartStationsError;
          if (!chartStationsData) throw new Error('Failed to fetch stations');
          const chartStationInfoMap = new Map<string, { stationName: string; departmentId: string | null }>();
          for (const station of (chartStationsData as unknown[])) {
            if (typeof station !== 'object' || station === null) continue;
            const s = station as { id: string; name: string; department_id?: string | null };
            chartStationInfoMap.set(s.id, {
              stationName: s.name,
              departmentId: s.department_id ?? null,
            });
          }
          const { data: chartSkillsData, error: chartSkillsError } = await supabase
            .from('employee_skills')
            .select('rating, employee_id, station_id')
            .in('employee_id', allEmployeeIds);
          if (chartSkillsError) throw chartSkillsError;
          if (!chartSkillsData) throw new Error('Failed to fetch skill ratings');
          const chartRatingMap: Record<string, ChartRatingMapValue> = {};
          for (const skill of chartSkillsData as unknown[]) {
            if (typeof skill !== 'object' || skill === null) continue;
            const s = skill as { employee_id: string; station_id: string; rating: number };
            const employeeId = s.employee_id;
            const stationId = s.station_id;
            const rating = s.rating;
            const stationInfo = stationId ? chartStationInfoMap.get(stationId) : undefined;
            const teamName = employeeIdToTeamNameMap[employeeId];
            const prodLineName = employeeIdToProdLineNameMap[employeeId] || 'Unknown Line';
            const employeeDeptId = employeeIdToDeptIdMap[employeeId];
            const departmentMatch = selectedDepartment === 'all' || (employeeDeptId && allDepartments.find(d => d.id === employeeDeptId)?.name === selectedDepartment);
            const prodLineMatch = selectedProductionLine === 'all' || prodLineName === selectedProductionLine;
            const teamMatch = selectedTeam === 'all' || teamName === selectedTeam;
            if (!departmentMatch || !prodLineMatch || !teamMatch) continue;
            if (stationInfo && teamName && employeeDeptId && stationInfo.departmentId && employeeDeptId === stationInfo.departmentId && rating !== null && rating > 0) {
              const key = `${employeeDeptId}-${prodLineName}-${teamName}-${stationId}`;
              if (!chartRatingMap[key]) {
                chartRatingMap[key] = {
                  department: allDepartments.find(d => d.id === employeeDeptId)?.name || 'Unknown Dept',
                  productionLine: prodLineName,
                  team: teamName,
                  station: stationInfo.stationName,
                  totalRating: 0,
                  count: 0,
                };
              }
              chartRatingMap[key].totalRating += rating;
              chartRatingMap[key].count += 1;
            }
          }
          const calculatedRatings: ChartRatingData[] = Object.values(chartRatingMap).map((data) => ({
            department: data.department,
            productionLine: data.productionLine,
            team: data.team,
            station: data.station,
            averageRating: data.count > 0 ? data.totalRating / data.count : 0,
            ratingCount: data.count,
          }));
          setData(calculatedRatings);
        } catch (err: unknown) {
          let errorMessage = 'Unknown error';
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          setError(errorMessage);
        } finally {
          setLoading(false);
          setTimeout(() => setShowChart(true), 50); // fade in chart after data loads
        }
      };
      fetchData();
    }, 400); // 400ms fade out
    return () => {
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    };
  }, [selectedDepartment, selectedProductionLine, selectedTeam, allDepartments]);

  // Skeleton loader
  const Skeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-1/3 bg-gray-200 rounded" />
      <div className="flex gap-2">
        {skeletonBars.map((_, i) => (
          <div key={i} className="h-40 w-10 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Station Average Skill Ratings</h2>
      <div className={`transition-opacity duration-400 ${showChart && !loading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <StationRatingsChart
          data={data}
          isAdmin={isAdmin}
          userTeam={userTeamName}
          allDepartments={allDepartments}
          allProductionLines={allProductionLines}
          allTeams={allTeams}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          selectedProductionLine={selectedProductionLine}
          setSelectedProductionLine={setSelectedProductionLine}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
        />
      </div>
      {(!showChart || loading) && <Skeleton />}
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );
}; 