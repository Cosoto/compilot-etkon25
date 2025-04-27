import { cookies as getCookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import MatrixPageClient from './MatrixPageClient';
import type { Database } from '@/lib/types/supabase';

// --- Types ---
type Department = Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name">;
type ProductionLine = Pick<Database["public"]["Tables"]["production_lines"]["Row"], "id" | "name" | "department_id">;
type Team = Pick<Database["public"]["Tables"]["teams"]["Row"], "id" | "name" | "production_line_id">;
type Station = Pick<Database["public"]["Tables"]["stations"]["Row"], "id" | "name" | "department_id">;
type AccessibleTeam = Pick<Database["public"]["Tables"]["team_access"]["Row"], "team_id" | "can_write">;

export default async function MatrixPage() {
  const cookieStore = await getCookies();
  const supabase = createSupabaseServerClient(cookieStore);

  // Fetch user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return <div className="p-4 text-red-600">You must be logged in to view this page.</div>;
  }

  // Fetch user profile (role)
  let isAdmin = false;
  let fetchError: string | null = null;
  let accessibleTeams: AccessibleTeam[] = [];
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError) throw new Error(profileError.message);
    isAdmin = profileData?.role === 'admin';
    // Fetch accessible teams if not admin
    if (!isAdmin) {
      const { data: accessData, error: accessError } = await supabase
        .from('team_access')
        .select('team_id, can_write')
        .eq('user_id', user.id);
      if (accessError) throw new Error(accessError.message);
      accessibleTeams = accessData || [];
    }
  } catch (err: unknown) {
    let errorMessage = 'Unknown error';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    fetchError = errorMessage;
  }

  // Fetch static data
  let departments: Department[] = [];
  let productionLines: ProductionLine[] = [];
  let teams: Team[] = [];
  let stations: Station[] = [];
  try {
    const [departmentsRes, prodLinesRes, teamsRes, stationsRes] = await Promise.all([
      supabase.from('departments').select('id, name'),
      supabase.from('production_lines').select('id, name, department_id'),
      supabase.from('teams').select('id, name, production_line_id'),
      supabase.from('stations').select('id, name, department_id'),
    ]);
    if (departmentsRes.error) throw new Error(departmentsRes.error.message);
    if (prodLinesRes.error) throw new Error(prodLinesRes.error.message);
    if (teamsRes.error) throw new Error(teamsRes.error.message);
    if (stationsRes.error) throw new Error(stationsRes.error.message);
    departments = departmentsRes.data || [];
    productionLines = prodLinesRes.data || [];
    teams = teamsRes.data || [];
    stations = stationsRes.data || [];
  } catch (err: unknown) {
    let errorMessage = 'Unknown error';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    fetchError = errorMessage;
  }

  if (fetchError && (!departments.length || !productionLines.length || !teams.length)) {
    return (
      <div className="p-4 text-red-600">Error loading critical page data: {fetchError}. Please try again later.</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Skill Level Guide
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Use the skill matrix to quickly view, track, and update each employee&apos;s skill level across different stations.
          </p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Level 1: Start of Learning</h3>
              <p className="text-sm text-red-600 dark:text-red-300">Cannot work independently. Requires full supervision and guidance.</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Level 2: In Training</h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">Can assist with tasks. Learning the process but not yet independent.</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Level 3: Standard Operator</h3>
              <p className="text-sm text-blue-600 dark:text-blue-300">Works independently with normal efficiency (80% - 100%).</p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-1">Level 4: Efficient Operator</h3>
              <p className="text-sm text-indigo-600 dark:text-indigo-300">Works independently with high efficiency (&gt; 100%).</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">Level 5: Trainer</h3>
              <p className="text-sm text-green-600 dark:text-green-300">Can train others and is recognized as an expert.</p>
            </div>
          </div>
        </div>
      </div>
      <MatrixPageClient
        initialDepartments={departments}
        initialProductionLines={productionLines}
        initialTeams={teams}
        initialStations={stations}
        isAdmin={isAdmin}
        initialAccessibleTeams={accessibleTeams}
        userId={user.id}
        fetchError={fetchError}
      />
    </div>
  );
} 