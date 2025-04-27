'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PieChart, Pie, Cell, Tooltip as PieTooltip, BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, ResponsiveContainer as BarResponsiveContainer } from 'recharts';
import { StationRatingsSection } from '@/components/matrix/StationRatingsSection';
import StationsGapReport from '@/components/matrix/StationsGapReport';
import type { RealtimeChannel } from '@supabase/supabase-js';
// TODO: Generate Supabase types (e.g., npx supabase gen types typescript --project-id <your-project-id> --schema public > src/lib/supabase/types.ts) and uncomment the type imports below for better type safety.
// import { Database } from '@/lib/supabase/types';

// type Employee = Database['public']['Tables']['employees']['Row'];
// type Team = Database['public']['Tables']['teams']['Row'];
// type ProductionLine = Database['public']['Tables']['production_lines']['Row'];
// type Department = Database['public']['Tables']['departments']['Row'];
// type Station = Database['public']['Tables']['stations']['Row'];
// type EmployeeSkill = Database['public']['Tables']['employee_skills']['Row'];
// 
// interface DepartmentInfo extends Department {
//     production_lines: ProductionLine[];
// }
// 
// interface EmployeeWithRelations extends Employee {
//     teams: (Team & { production_lines: (ProductionLine & { departments: Department | null }) | null }) | null;
// }

type EmployeeForGap = {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string | null;
  user_id: string | null;
  teams?: {
    id?: string;
    name?: string;
    production_lines?: {
      id?: string;
      name?: string;
      department_id?: string | null;
    } | null;
  };
};

interface EmployeeStats {
    total: number;
    filteredTotal?: number; // Optional: Show total filtered if not admin
    byDepartment: { name: string; count: number }[];
    byContract: { type: string; count: number }[];
}

interface ChartRatingData {
    department: string;
    productionLine: string;
    team: string;
    station: string;
    averageRating: number;
    ratingCount: number;
}

// Use a distinct color palette for the report card
const REPORT_COLORS = ['#06b6d4', '#f43f5e', '#fbbf24', '#a78bfa', '#f59e42']; // cyan-500, rose-500, amber-400, violet-400, orange-400

// Define a type for BarValueLabel props
interface BarValueLabelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  payload: { percent?: number };
}
const BarValueLabel = (props: BarValueLabelProps) => {
  const { x, y, width, height, value, payload } = props;
  const percent = payload && typeof payload.percent === 'number' ? ` (${payload.percent.toFixed(1)}%)` : '';
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      fill="#6366f1"
      fontWeight={700}
      fontSize={15}
      alignmentBaseline="middle"
    >
      {value}{percent}
    </text>
  );
};

export default function DashboardPage() {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [employeeData, setEmployeeData] = useState<EmployeeStats | null>(null);
    const [stationRatings, setStationRatings] = useState<ChartRatingData[]>([]);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [userTeamId, setUserTeamId] = useState<string | null>(null);
    const [userTeamName, setUserTeamName] = useState<string | undefined>(undefined);
    // State for holding structural data needed by chart filters
    const [allDepartments, setAllDepartments] = useState<{id: string; name: string}[]>([]);
    const [allTeams, setAllTeams] = useState<{id: string; name: string; production_line_id: string | null; department_id: string | null}[]>([]);
    // Add state for selectedDepartment and selectedTeam
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [selectedTeam, setSelectedTeam] = useState<string>('all');
    const [allProductionLines, setAllProductionLines] = useState<{id: string; name: string; department_id: string | null}[]>([]);
    const [selectedProductionLine] = useState<string>('all');
    // --- Add state and refs for tab visibility and deferred retry ---
    const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
    const retryPendingRef = useRef(false);
    const retryCountRef = useRef(0);
    const currentChannelRef = useRef<RealtimeChannel | null>(null);
    const [stationTargets, setStationTargets] = useState<{ [stationId: string]: number }>({});
    const [stationsForGap, setStationsForGap] = useState<{ id: string; name: string }[]>([]);
    const [employeesForGap, setEmployeesForGap] = useState<EmployeeForGap[]>([]);
    const [skillRatingsMap, setSkillRatingsMap] = useState<{ [key: string]: number | null }>({});

    const fetchUserRole = useCallback(async () => {
        setError(null);
        setIsAdmin(false);
        setUserTeamId(null);
        setUserTeamName(undefined);

        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError) throw new Error(`Authentication error: ${authError.message}`);
            if (!authData?.user?.id) throw new Error('No authenticated user found');
            const authUserId = authData.user.id;
            console.log('Auth successful - User ID:', authUserId);

            const { data: publicUserData, error: publicUserError } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', authUserId)
                .single();

            if (publicUserError) {
                if (publicUserError.code === 'PGRST116') {
                    console.error(`User profile not found in public.users for Auth ID: ${authUserId}`);
                    throw new Error('User profile not found. Please contact your administrator.');
                }
                console.error('Database error fetching user profile:', publicUserError);
                throw new Error(`Database error fetching profile: ${publicUserError.message}`);
            }

            if (!publicUserData) {
                console.error(`User profile data unexpectedly null for Auth ID: ${authUserId}`);
                throw new Error('User profile not found. Please contact your administrator.');
            }
            
            console.log('User profile fetched:', publicUserData);
            const userIsAdmin = publicUserData.role === 'admin';
            setIsAdmin(userIsAdmin);

            if (!userIsAdmin) {
                const { data: permissionsData, error: permissionsError } = await supabase
                    .from('user_permissions')
                    .select('team_id')
                    .eq('user_id', authUserId)
                    .eq('can_view_team', true);

                if (permissionsError) {
                    console.error('Database error fetching user permissions:', permissionsError);
                    throw new Error(`Database error fetching permissions: ${permissionsError.message}`);
                }

                if (!permissionsData || permissionsData.length === 0) {
                    console.error(`No view permissions found in user_permissions for non-admin User ID: ${authUserId}`);
                    throw new Error('User has no assigned team permissions. Please contact your administrator.');
                }

                const firstTeamId = permissionsData[0].team_id;
                console.log(`Non-admin user. Found permission for Team ID: ${firstTeamId}`);
                setUserTeamId(firstTeamId);

                const { data: teamData, error: teamError } = await supabase
                    .from('teams')
                    .select('name')
                    .eq('id', firstTeamId)
                    .single();
                
                if (teamError) {
                     console.error(`Error fetching team name for ID ${firstTeamId}:`, teamError);
                     setUserTeamName('Unknown Team'); 
                } else {
                     setUserTeamName(teamData?.name);
                }
            } else {
                console.log('User is admin.');
                setUserTeamId(null); 
                setUserTeamName(undefined);
            }

        } catch (err: unknown) {
            console.error('Error in fetchUserRole process:', err);
            if (err instanceof Error) {
                setError(err.message || 'An unknown error occurred while fetching user role.');
            } else {
                setError('An unknown error occurred while fetching user role.');
            }
            setIsAdmin(false);
            setUserTeamId(null);
            setUserTeamName(undefined);
        }
    }, []);

    const fetchDashboardData = useCallback(async () => {
        if (loading === false && userTeamId === null && isAdmin === false) {
            console.log('Waiting for user role/team info...');
            return;
        }

        setLoading(true);
        setError(null);
        console.log(`Fetching dashboard data... Admin: ${isAdmin}, TeamID: ${userTeamId}`);

        try {
            // --- Fetch Structural Data (Lines, Teams) ---
            const { data: deptsData, error: deptsError } = await supabase
                .from('departments')
                .select('id, name');
            if (deptsError) throw deptsError;
            setAllDepartments(deptsData || []);
            
            // Fetch teams and include nested production line with department ID
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('id, name, production_line_id, production_lines(department_id)'); // Fetch nested department_id
            if (teamsError) throw teamsError;
            
            // Process teams data to include department_id directly
            const processedTeams = (teamsData || [])
                .map((team: unknown) => {
                    if (typeof team !== 'object' || team === null) return null;
                    const t = team as { id: string; name: string; production_line_id: string | null; production_lines?: { department_id?: string | null } };
                    return {
                        id: t.id,
                        name: t.name,
                        production_line_id: t.production_line_id,
                        department_id: t.production_lines?.department_id ?? null,
                    };
                })
                .filter((t): t is { id: string; name: string; production_line_id: string | null; department_id: string | null } => t !== null);
            setAllTeams(processedTeams);

            // Fetch production lines
            const { data: prodLinesData, error: prodLinesError } = await supabase
                .from('production_lines')
                .select('id, name, department_id');
            if (prodLinesError) throw prodLinesError;
            setAllProductionLines(prodLinesData || []);

            // --- Fetch Employee Stats (respecting user permissions) ---
            let employeeStatsQuery = supabase
                .from('employees')
                .select('id, contract_type, teams(id, name, production_lines(id, name, departments(id, name)))', { count: 'exact', head: false }); // Select only needed fields for stats

            let filteredEmployeeCount = 0;

            if (!isAdmin && userTeamId) {
                console.log(`Filtering employee stats for team ID: ${userTeamId}`);
                employeeStatsQuery = employeeStatsQuery.eq('team_id', userTeamId);
            }

            const { data: employeesForStats, error: statsEmpError, count: totalOrFilteredEmployees } = await employeeStatsQuery;
            if (statsEmpError) throw statsEmpError;
            if (!employeesForStats) throw new Error('Failed to fetch employees for stats');

            filteredEmployeeCount = totalOrFilteredEmployees || 0;

            // Calculate total employees if admin
            let totalCompanyEmployees = filteredEmployeeCount;
            if (isAdmin) {
                const { count: totalCount, error: totalCountError } = await supabase
                    .from('employees')
                    .select('id', { count: 'exact', head: true });
                if (totalCountError) console.error("Failed to get total employee count:", totalCountError);
                else totalCompanyEmployees = totalCount || 0;
            }

            const empStats: EmployeeStats = {
                total: totalCompanyEmployees,
                byContract: [],
                byDepartment: [],
            };
            if (!isAdmin) {
                empStats.filteredTotal = filteredEmployeeCount;
            }

            const contractCounts: Record<string, number> = {};
            const departmentCounts: Record<string, number> = {};
            const departmentIdToName: Record<string, string> = {};
            const employeeIdToTeamName: Record<string, string> = {};

            for (const emp of employeesForStats as unknown[]) {
                if (typeof emp !== 'object' || emp === null) continue;
                const e = emp as { id: string; contract_type?: string; teams?: { name?: string; production_lines?: { departments?: { id?: string; name?: string } } } };
                if (e.contract_type) {
                    contractCounts[e.contract_type] = (contractCounts[e.contract_type] || 0) + 1;
                }
                const dept = e.teams?.production_lines?.departments;
                if (dept?.id && dept.name) {
                    departmentIdToName[dept.id] = dept.name;
                    departmentCounts[dept.id] = (departmentCounts[dept.id] || 0) + 1;
                } else {
                    const unassignedDeptId = 'unassigned';
                    departmentIdToName[unassignedDeptId] = 'Unassigned/Other';
                    departmentCounts[unassignedDeptId] = (departmentCounts[unassignedDeptId] || 0) + 1;
                }
                if (e.teams?.name) {
                    employeeIdToTeamName[e.id] = e.teams.name;
                }
            }

            empStats.byContract = Object.entries(contractCounts).map(([type, count]) => ({ type, count }));
            empStats.byDepartment = Object.entries(departmentCounts).map(([id, count]) => ({
                name: departmentIdToName[id],
                count,
            }));

            setEmployeeData(empStats);

            // --- Fetch Data for Station Ratings Chart (fetch broadly) ---
            console.log('Fetching all employee IDs for station ratings calculation...');
            // Fetch employees with nested data needed for mapping department
            const { data: allEmployeesForSkills, error: allEmpError } = await supabase
                .from('employees')
                .select('id, first_name, last_name, team_id, user_id, teams(id, name, production_lines(id, name, department_id))');

            if (allEmpError) throw allEmpError;
            if (!allEmployeesForSkills) throw new Error('Failed to fetch all employees for skills');

            const normalizedEmployees = (allEmployeesForSkills || []).map(emp => ({
                ...emp,
                first_name: emp.first_name ?? '',
                last_name: emp.last_name ?? '',
                team_id: emp.team_id ?? null,
            }));
            setEmployeesForGap(normalizedEmployees);

            const allEmployeeIds = allEmployeesForSkills.map(emp => emp.id);
            
            // Build map from employee ID to department ID, production line name, and team name
            const employeeIdToDeptIdMap: Record<string, string | null> = {};
            const employeeIdToProdLineNameMap: Record<string, string> = {};
            const employeeIdToTeamNameMap: Record<string, string> = {};
            for (const emp of (allEmployeesForSkills as unknown[])) {
                if (typeof emp !== 'object' || emp === null) continue;
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
            }

            if (allEmployeeIds.length === 0) {
                console.log('No employees found in the company, skipping station ratings fetch.');
                setStationRatings([]);
            } else {
                // --- Fetch Stations Info ---
                // Fetch stations with their department ID
                const { data: chartStationsData, error: chartStationsError } = await supabase
                    .from('stations')
                    .select('id, name, department_id'); // Changed from production_line_id

                if (chartStationsError) throw chartStationsError;
                if (!chartStationsData) throw new Error('Failed to fetch stations');

                // Build map from station ID to its info (name, department ID)
                const chartStationInfoMap = new Map<string, { stationName: string; departmentId: string | null }>();
                for (const station of (chartStationsData as unknown[])) {
                    if (typeof station !== 'object' || station === null) continue;
                    const s = station as { id: string; name: string; department_id?: string | null };
                    chartStationInfoMap.set(s.id, {
                        stationName: s.name,
                        departmentId: s.department_id ?? null,
                    });
                }

                // --- Fetch Skills for ALL employees ---
                console.log(`Fetching skills for ${allEmployeeIds.length} employees...`);
                const { data: chartSkillsData, error: chartSkillsError } = await supabase
                    .from('employee_skills')
                    .select('rating, employee_id, station_id')
                    .in('employee_id', allEmployeeIds);

                if (chartSkillsError) throw chartSkillsError;
                if (!chartSkillsData) throw new Error('Failed to fetch skill ratings');

                console.log('Fetched chartSkillsData:', chartSkillsData);

                // --- Aggregate Skills --- 
                // Define the structure for aggregated data
                type AggregatedRating = {
                    totalRating: number;
                    count: number;
                    departmentName: string;
                    productionLineName: string;
                    teamName: string;
                    stationName: string;
                };
                // Use Record for the map, key: departmentId-teamName-stationId
                const chartRatingMap: Record<string, AggregatedRating> = {};

                // Need department names map (can reuse from stats if available, or fetch)
                // Assuming departmentIdToName is populated from stats section above

                for (const skill of (chartSkillsData as unknown[])) {
                    if (typeof skill !== 'object' || skill === null) continue;
                    const s = skill as { employee_id: string; station_id: string; rating: number };
                    const employeeId = s.employee_id;
                    const stationId = s.station_id;
                    const rating = s.rating;
                    // Look up related info
                    const stationInfo = stationId ? chartStationInfoMap.get(stationId) : undefined;
                    const teamName = employeeIdToTeamNameMap[employeeId];
                    const prodLineName = employeeIdToProdLineNameMap[employeeId] || 'Unknown Line';
                    const employeeDeptId = employeeIdToDeptIdMap[employeeId];
                    const departmentName = employeeDeptId ? departmentIdToName[employeeDeptId] : 'Unknown Dept';
                    // Determine aggregation key based on selected filters
                    let key: string;
                    if (selectedTeam !== 'all') {
                        key = `${employeeDeptId}-${prodLineName}-${teamName}-${stationId}`;
                    } else if (selectedProductionLine !== 'all') {
                        key = `${employeeDeptId}-${prodLineName}-${stationId}`;
                    } else if (selectedDepartment !== 'all') {
                        key = `${employeeDeptId}-${stationId}`;
                    } else {
                        key = `${stationId}`;
                    }
                    // Check if all data is available and employee/station departments match
                    if (stationInfo && teamName && departmentName && employeeDeptId && 
                        stationInfo.departmentId && employeeDeptId === stationInfo.departmentId && 
                        rating !== null && rating > 0) {  // Only count ratings > 0
                        if (!chartRatingMap[key]) {
                            chartRatingMap[key] = {
                                totalRating: 0,
                                count: 0,
                                departmentName: departmentName, // Store dept name
                                productionLineName: prodLineName,
                                teamName: teamName,
                                stationName: stationInfo.stationName
                            };
                        }
                        chartRatingMap[key].totalRating += rating;
                        chartRatingMap[key].count += 1;
                    }
                }

                // Rename StationRating type and update calculation
                type ChartRatingData = {
                    department: string;
                    productionLine: string;
                    team: string;
                    station: string;
                    averageRating: number;
                    ratingCount: number;
                };

                const calculatedRatings: ChartRatingData[] = Object.values(chartRatingMap).map(data => ({
                    department: data.departmentName,
                    productionLine: data.productionLineName,
                    team: data.teamName,
                    station: data.stationName,
                    averageRating: data.count > 0 ? data.totalRating / data.count : 0,
                    ratingCount: data.count,
                }));

                console.log('Calculated stationRatings:', calculatedRatings);

                setStationRatings(calculatedRatings); // Removed type assertion

                // Build stations array for gap report
                setStationsForGap((chartStationsData || []).map((s: unknown) => {
                    if (typeof s === 'object' && s !== null && 'id' in s && 'name' in s) {
                        return { id: (s as { id: string }).id, name: (s as { name: string }).name };
                    }
                    return { id: '', name: '' };
                }));
                // Build skillRatings map for gap report
                const skillMap: { [key: string]: number | null } = {};
                (chartSkillsData || []).forEach((row: unknown) => {
                    if (typeof row !== 'object' || row === null) return;
                    const r = row as { employee_id: string; station_id: string; rating: number };
                    skillMap[`${r.employee_id}-${r.station_id}`] = r.rating;
                });
                setSkillRatingsMap(skillMap);
            }

            console.log('Dashboard data fetched successfully.');

        } catch (err: unknown) {
            console.error('Error fetching dashboard data:', err);
            if (err instanceof Error) {
                setError(err.message || 'An unknown error occurred while fetching data.');
            } else {
                setError('An unknown error occurred while fetching data.');
            }
        } finally {
            setLoading(false);
        }
    }, [userTeamId, isAdmin, selectedDepartment, selectedTeam, selectedProductionLine]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const reInitializeUserRole = useCallback(async () => {
        setLoading(true);
        await fetchUserRole();
    }, [fetchUserRole]);

    useEffect(() => {
        const initializeUserRole = async () => {
            setLoading(true);
            await fetchUserRole();
        };

        initializeUserRole();
    }, [fetchUserRole]);

    useEffect(() => {
        if (isAdmin || userTeamId !== null) { 
            console.log('Role/Team determined, proceeding to fetch data...');
            fetchDashboardData();
        }
    }, [isAdmin, userTeamId, fetchDashboardData]); 

    // --- Track tab visibility ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabVisible(!document.hidden);
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        setIsTabVisible(!document.hidden);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // --- Realtime subscription logic with deferred retry ---
    useEffect(() => {
        let unsubscribed = false;
        const MAX_RETRIES = 5;
        const RETRY_DELAY = 2000;

        const handleDbChange = async (payload: unknown) => {
            if (!payload || typeof payload !== 'object') return;
            console.log('Database change payload:', payload);
            reInitializeUserRole();
        };

        const setupRealtimeSubscription = () => {
            if (currentChannelRef.current && typeof currentChannelRef.current.unsubscribe === 'function') {
                currentChannelRef.current.unsubscribe().then((result: 'ok' | 'error' | 'timed out') => {
                    if (result !== 'ok') {
                        console.error('Error unsubscribing from previous channel:', result);
                    }
                }).catch((err: Error) => 
                    console.error('Error unsubscribing from previous channel:', err)
                );
            }

            const channel = supabase.channel('dashboard-changes', { 
                config: { 
                    broadcast: { self: true }, 
                    presence: { key: '' }
                } 
            });

            currentChannelRef.current = channel;

            channel
                .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, handleDbChange)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, handleDbChange)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_skills' }, handleDbChange)
                .subscribe(async (status: string, err?: Error) => {
                    if (unsubscribed) return;
                    if (status === 'SUBSCRIBED') {
                        console.log('Realtime channel subscribed successfully');
                        retryCountRef.current = 0; // Reset retry count on successful connection
                        retryPendingRef.current = false;
                    } else if (status === 'CHANNEL_ERROR') {
                        const errorMessage = err?.message || 'Unknown realtime connection issue';
                        console.error('Realtime subscription error:', errorMessage);
                        if (document.hidden) {
                            retryPendingRef.current = true;
                            return;
                        }
                        if (retryCountRef.current < MAX_RETRIES) {
                            retryCountRef.current++;
                            console.log(`Attempting to reconnect... (Attempt ${retryCountRef.current}/${MAX_RETRIES})`);
                            setTimeout(setupRealtimeSubscription, RETRY_DELAY);
                        } else {
                            setError(`Realtime connection failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
                        }
                    } else if (status === 'TIMED_OUT') {
                        console.warn('Realtime subscription timed out, attempting to reconnect...');
                        if (retryCountRef.current < MAX_RETRIES) {
                            retryCountRef.current++;
                            setTimeout(setupRealtimeSubscription, RETRY_DELAY);
                        }
                    }
                });

            return channel;
        };

        const channel = setupRealtimeSubscription();

        const handleTabVisibleRetry = () => {
            if (isTabVisible && retryPendingRef.current) {
                retryPendingRef.current = false;
                setupRealtimeSubscription();
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('visibilitychange', handleTabVisibleRetry);
        }

        return () => {
            unsubscribed = true;
            if (channel) {
                channel.unsubscribe().then(() => {
                    supabase.removeChannel(channel).catch(removeErr => 
                        console.error('Error removing channel:', removeErr)
                    );
                }).catch(err => {
                    console.error('Error during channel cleanup:', err);
                });
            }
            if (typeof window !== 'undefined') {
                window.removeEventListener('visibilitychange', handleTabVisibleRetry);
            }
        };
    }, [fetchUserRole, isTabVisible, reInitializeUserRole]);

    // Handler for stationTargets
    const handleStationTargetChange = useCallback((stationId: string, target: number) => {
        setStationTargets(prev => ({ ...prev, [stationId]: target }));
    }, []);

    // After user role is determined, set selectedTeam/selectedDepartment for non-admins
    useEffect(() => {
        if (!isAdmin && userTeamId) {
            setSelectedTeam(userTeamId);
            // Auto-select department for non-admins based on their team
            const team = allTeams.find(t => t.id === userTeamId);
            if (team?.department_id) setSelectedDepartment(team.department_id);
        } else if (isAdmin) {
            setSelectedTeam('all');
            setSelectedDepartment('all');
        }
    }, [isAdmin, userTeamId, allTeams]);

    if (loading) {
        return (
            <div>
                <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dashboard Reports</h1>
                <p>Loading dashboard data...</p>
            </div>
        );
    }
    
    if (error) {
        return (
             <div>
                <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dashboard Reports</h1>
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    console.log('[DashboardPage] Final stationRatings state BEFORE render:', stationRatings);

    // Enhanced contract and department data with percent
    const contractData = employeeData ? employeeData.byContract.map(c => ({
        name: c.type,
        value: c.count,
        percent: employeeData.total ? (c.count / employeeData.total) * 100 : 0,
    })) : [];
    const departmentData = employeeData ? employeeData.byDepartment.map(d => ({
        name: d.name,
        value: d.count,
        percent: employeeData.total ? (d.count / employeeData.total) * 100 : 0,
    })) : [];

    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

            {!isAdmin && userTeamName && (
                <p className="mb-4 text-sm text-gray-600">Displaying data for team: <strong>{userTeamName}</strong></p>
            )}

            {/* Admin-only filter UI */}
            {isAdmin && (
                <div className="flex gap-4 mb-4">
                    <select
                        className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Select Department"
                        value={selectedDepartment}
                        onChange={e => setSelectedDepartment(e.target.value)}
                        tabIndex={0}
                    >
                        <option value="all">All Departments</option>
                        {allDepartments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                    <select
                        className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Select Team"
                        value={selectedTeam}
                        onChange={e => setSelectedTeam(e.target.value)}
                        tabIndex={0}
                    >
                        <option value="all">All Teams</option>
                        {allTeams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="mb-8 w-full max-w-5xl mx-auto">
                <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 flex flex-col md:flex-row gap-8 items-center border border-gray-100">
                    {/* Donut Chart for Contract Type */}
                    <div className="flex-1 flex flex-col items-center min-w-[220px]">
                        <div className="text-lg font-bold text-gray-800 mb-2">Workforce Overview</div>
                        <div className="relative">
                            <PieChart width={220} height={220}>
                                <Pie
                                    data={contractData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    fill="#06b6d4"
                                    isAnimationActive={true}
                                >
                                    {contractData.map((entry, idx) => (
                                        <Cell key={`cell-${idx}`} fill={REPORT_COLORS[idx % REPORT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <PieTooltip formatter={(value, name, props) => [`${value} (${props.payload.percent.toFixed(1)}%)`, name]} />
                            </PieChart>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-extrabold text-gray-900">{employeeData?.total ?? ''}</span>
                                <span className="text-xs text-gray-500 font-medium">Total Employees</span>
                            </div>
                        </div>
                        <div className="mt-3 text-sm text-gray-600 font-semibold">By Contract Type</div>
                        <div className="flex flex-wrap gap-4 mt-2 justify-center">
                            {contractData.map((entry, idx) => (
                                <span key={entry.name} className="flex items-center gap-1 text-xs text-gray-700">
                                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: REPORT_COLORS[idx % REPORT_COLORS.length] }} aria-label={entry.name + ' color'} />
                                    {entry.name}: <span className="font-semibold">{entry.value}</span> <span className="text-gray-400">({entry.percent.toFixed(1)}%)</span>
                                </span>
                            ))}
                        </div>
                    </div>
                    {/* Bar Chart for Department */}
                    <div className="flex-1 flex flex-col items-center w-full min-w-[260px]">
                        <div className="text-lg font-bold text-gray-800 mb-2 invisible md:visible">&nbsp;</div>
                        <div className="w-full overflow-x-auto">
                            <BarResponsiveContainer width={departmentData.length > 5 ? departmentData.length * 60 : 320} height={220}>
                                <BarChart data={departmentData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                                    <XAxis type="number" allowDecimals={false} hide />
                                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 15, fontWeight: 600, fill: '#374151' }} />
                                    <BarTooltip formatter={(value, name, props) => [`${value} (${props.payload.percent.toFixed(1)}%)`, 'Employees']} />
                                    <Bar dataKey="value" fill="#10b981" name="Employees" barSize={28} radius={[6, 6, 6, 6]}
                                        label={BarValueLabel}
                                    />
                                </BarChart>
                            </BarResponsiveContainer>
                        </div>
                        <div className="mt-3 text-sm text-gray-600 font-semibold">By Department</div>
                        <div className="flex flex-wrap gap-4 mt-2 justify-center">
                            {departmentData.map((department) => (
                                <span key={department.name} className="flex items-center gap-1 text-xs text-gray-700">
                                    <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" aria-label={department.name + ' color'} />
                                    {department.name}: <span className="font-semibold">{department.value}</span> <span className="text-gray-400">({department.percent.toFixed(1)}%)</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <StationRatingsSection
                allDepartments={allDepartments}
                allProductionLines={allProductionLines}
                allTeams={allTeams}
                isAdmin={isAdmin}
                userTeamName={userTeamName}
            />

            <StationsGapReport
                stations={stationsForGap}
                employees={employeesForGap}
                skillRatings={skillRatingsMap}
                stationTargets={stationTargets}
                onTargetChange={handleStationTargetChange}
            />
             {!loading && !error && stationRatings.length === 0 && employeeData && (
                <div className="mt-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">
                    No station skill data available to display.
                </div>
            )}
        </div>
    );
} 