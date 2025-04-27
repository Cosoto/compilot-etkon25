import React from 'react';
import { cookies } from 'next/headers'; // Import cookies
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Correct import
import { Badge } from "@/components/ui/badge"; // Assuming standard path
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { User, Factory, CalendarDays, AlertTriangle } from "lucide-react";

// Updated data structure
interface LowSkillInfo {
  id: string; // Using profile_skill record id or a composite key
  workerName: string;
  stationName: string;
  skillLevel: number;
  sinceDate: Date;
  team?: string;
  isUrgent?: boolean; // Added flag
  needsFeedback?: boolean; // Added flag
}

// --- Authorization & User Context ---

type UserRole = 'admin' | 'user';
interface UserContext {
  role: UserRole;
  teams?: string[];      // Team IDs for filtering
  teamNames?: string[];  // Team names for display
}

// Real implementation: fetch user context from Supabase
const getCurrentUserContext = async (supabase: ReturnType<typeof createSupabaseServerClient>): Promise<UserContext> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { role: 'user' };
  const { data: profile, error } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (error || !profile) return { role: 'user' };
  if (profile.role === 'admin') return { role: 'admin' };
  // Fetch team IDs and names for user
  const { data: teamsData } = await supabase
    .from('team_access')
    .select('team_id, team:teams(name)')
    .eq('user_id', user.id);
  const teams = teamsData ? teamsData.map((t: { team_id: string }) => t.team_id) : [];
  const teamNames = teamsData ? teamsData.map((t: { team: { name: string } | null }) => t.team?.name || 'Unknown Team') : [];
  return { role: 'user', teams, teamNames };
};

// --- Data Fetching from Supabase ---

const fetchLowSkillWorkers = async (supabase: ReturnType<typeof createSupabaseServerClient>, userContext: UserContext): Promise<LowSkillInfo[]> => {
  let teamIds: string[] = [];
  if (userContext.role === 'user' && userContext.teams && userContext.teams.length > 0) {
    teamIds = userContext.teams;
  }
  let query = supabase
    .from('employee_skills')
    .select(`
      id,
      created_at,
      rating,
      employees ( id, first_name, last_name, team_id ),
      stations ( id, name )
    `)
    .lte('rating', 2);
  if (teamIds.length > 0) {
    query = query.in('employees.team_id', teamIds);
  }
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error || !data) return [];
  const mappedData = data.map((row: unknown): LowSkillInfo | null => {
    if (typeof row !== 'object' || row === null) return null;
    const r = row as {
      rating?: number;
      created_at?: string;
      employees?: { id?: string; first_name?: string; last_name?: string; team_id?: string };
      stations?: { id?: string; name?: string };
    };
    const employee = r.employees;
    const station = r.stations;
    if (!employee || typeof employee !== 'object' || !station || typeof station !== 'object') {
      return null;
    }
    const skillLevel = typeof r.rating === 'number' ? r.rating : -1;
    const assignedDateValue = r.created_at;
    const assignedDate = assignedDateValue && !isNaN(new Date(assignedDateValue).getTime())
      ? new Date(assignedDateValue)
      : null;
    if (skillLevel === -1 || assignedDate === null) {
      return null;
    }
    const workerName = `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || 'Unknown Worker';
    const id = `${employee.id}-${station.id}-${skillLevel}-${assignedDate.toISOString()}`;
    let isUrgent = false;
    if (skillLevel === 1) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      if (assignedDate < twoDaysAgo) {
        isUrgent = true;
      }
    }
    let needsFeedback = false;
    if (skillLevel === 2) {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      if (assignedDate < fiveDaysAgo) {
        needsFeedback = true;
      }
    }
    return {
      id,
      workerName,
      stationName: station.name ?? 'Unknown Station',
      skillLevel,
      sinceDate: assignedDate,
      team: employee.team_id,
      isUrgent,
      needsFeedback,
    };
  });
  return mappedData.filter((item): item is LowSkillInfo => item !== null);
};

// --- Skills Page Component ---

const SkillsPage = async () => {
  const cookieStore = await cookies(); // Explicitly await (though likely unnecessary)
  const supabase = createSupabaseServerClient(cookieStore); // Ensure this line is correct based on imports

  // IMPORTANT: Replace placeholder getCurrentUserContext with your actual implementation
  const userContext = await getCurrentUserContext(supabase);
  const lowSkillData = await fetchLowSkillWorkers(supabase, userContext);

  // Helper for date formatting
  const formatDate = (date: Date): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-GB');
  };

  // Helper to get skill level color
  const getSkillLevelClass = (level: number): string => {
    switch (level) {
      case 0: return 'text-red-600 font-bold';
      case 1: return 'text-orange-500 font-semibold';
      case 2: return 'text-yellow-600 font-medium';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
       <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 border-b pb-2">
            Skill Development Needs Report
        </h1>

      {userContext.role === 'user' && (
        <p className="text-base md:text-lg mb-6 text-gray-600 italic">
          Showing data for your team(s): {userContext.teamNames?.join(', ') || 'N/A'}
        </p>
      )}

      {lowSkillData.length === 0 ? (
         <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg shadow-sm text-center mt-6">
            <p className="text-gray-500">
                No employees currently require skill development attention
                {userContext.role === 'user' ? ' in your assigned team(s)' : ''}.
            </p>
        </div>
      ) : (
        // Apply grid layout
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {lowSkillData.map((item) => {
            // REMOVED console.log here

            return (
              <Card key={item.id} className="flex flex-col">
                 <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                        <User className="mr-2 h-5 w-5 text-indigo-600" />
                        {item.workerName}
                    </CardTitle>
                    {userContext.role === 'admin' && item.team && (
                        <p className="text-xs text-gray-500 italic pt-1">Team: {item.team}</p>
                     )}
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                    <div className="flex items-center text-sm text-gray-700">
                        <Factory className="mr-2 h-4 w-4 text-gray-500" />
                        Station: <span className="font-medium ml-1">{item.stationName}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                        <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                        <span>
                            Level <span className={getSkillLevelClass(item.skillLevel)}>{item.skillLevel}</span> since:
                            <span className="font-medium ml-1">{formatDate(item.sinceDate)}</span>
                        </span>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-between items-center pt-4 min-h-[36px]">
                    {/* Left side: Urgent Badge */}
                    <div className="flex items-center h-5"> {/* Ensures vertical centering and height */}
                        {item.isUrgent && (
                            <Badge variant="destructive" className="flex items-center">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Urgent
                            </Badge>
                        )}
                        {/* No placeholder div needed if parent has min-height */}
                    </div>

                    {/* Right side: Potentially Badge + Text */}
                    <div className="flex items-center space-x-2"> {/* Removed h-5, relies on footer items-center */}
                        {item.needsFeedback ? ( // Level 2 condition: Show Badge AND Text
                            <>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100/80">
                                    Attention
                                </Badge>
                                <p className="text-xs text-gray-500 italic">
                                    Feedback Quantity/Quality
                                </p>
                            </>
                        ) : item.isUrgent ? ( // Level 1 condition: Show ONLY Text
                            <p className="text-xs text-gray-500 italic">
                                Training module questions (Documents)?
                            </p>
                        ) : (
                             null // Render nothing if neither condition met
                        )}
                    </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SkillsPage; 