import { useState, useEffect, Fragment, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client'; // Keep alias for external lib
import { User, TeamAccess } from '../../lib/schema'; // Use relative path for schema
// Remove old permission imports: import { TeamUserPermission, TeamPermissionAction } from '@/lib/permissions';
import { getUserTeamAccess, grantTeamAccess, revokeTeamAccess } from '../../lib/teamAccess'; // Use relative path for helpers
import { Dialog, Transition } from '@headlessui/react';

// Define the Team type if not globally available
type Team = {
  id: string;
  name: string;
  // Add other relevant team fields if needed for display
};

// Simplify permission flags
const teamAccessFlags: { key: 'can_read' | 'can_write', label: string }[] = [
  { key: 'can_read', label: 'Read Access' },
  { key: 'can_write', label: 'Write Access' },
];

type UserPermissionsProps = {
  user: User;
  onClose: () => void;
};

export default function UserPermissions({ user, onClose }: UserPermissionsProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamAccessList, setTeamAccessList] = useState<TeamAccess[]>([]); // Use new state name and type
  const [pendingAccessList, setPendingAccessList] = useState<TeamAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch both all teams and the user's specific access records
  const fetchTeamsAndUserAccess = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch this user's access records using the new helper
      const accessData = await getUserTeamAccess(user.id);
      setTeamAccessList(accessData);

    } catch (err) {
        console.error("Error in fetchTeamsAndUserAccess:", err);
      setError(err instanceof Error ? err.message : 'An error occurred fetching data');
      setTeamAccessList([]); // Clear access list on error
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchTeamsAndUserAccess();
  }, [user.id, fetchTeamsAndUserAccess]);

  useEffect(() => {
    setPendingAccessList(JSON.parse(JSON.stringify(teamAccessList)));
  }, [teamAccessList]);

  // New: handle local checkbox change
  const handlePendingAccessChange = (
    teamId: string,
    accessType: 'can_read' | 'can_write',
    isChecked: boolean
  ) => {
    setPendingAccessList(prev => {
      const idx = prev.findIndex(p => p.team_id === teamId);
      let updated: TeamAccess[];
      if (idx !== -1) {
        // Update existing
        const copy = [...prev];
        const item = { ...copy[idx] };
        if (accessType === 'can_read') {
          item.can_read = isChecked;
          if (!isChecked) item.can_write = false; // Uncheck write if read is unchecked
        } else {
          item.can_write = isChecked;
          if (isChecked) item.can_read = true; // Write implies read
        }
        copy[idx] = item;
        updated = copy;
      } else if (isChecked) {
        // Add new
        updated = [
          ...prev,
          {
            id: '',
            user_id: user.id,
            team_id: teamId,
            can_read: accessType === 'can_read' ? true : false,
            can_write: accessType === 'can_write' ? true : false,
            created_at: '',
          },
        ];
      } else {
        // No-op if not checked and not present
        updated = prev;
      }
      // Remove if both unchecked
      return updated.filter(a => a.can_read || a.can_write);
    });
  };

  // New: Save all changes
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // Compare pendingAccessList to teamAccessList
      const origMap = new Map(teamAccessList.map(a => [a.team_id, a]));
      const pendingMap = new Map(pendingAccessList.map(a => [a.team_id, a]));
      // Handle grants/updates
      for (const pending of pendingAccessList) {
        const orig = origMap.get(pending.team_id);
        if (!orig || orig.can_read !== pending.can_read || orig.can_write !== pending.can_write) {
          await grantTeamAccess(user.id, pending.team_id, {
            canRead: pending.can_read,
            canWrite: pending.can_write,
          });
        }
      }
      // Handle revokes
      for (const orig of teamAccessList) {
        if (!pendingMap.has(orig.team_id)) {
          await revokeTeamAccess(user.id, orig.team_id);
        }
      }
      await fetchTeamsAndUserAccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save access');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get the current access state for a team (from pending)
  const getPendingAccessForTeam = (teamId: string): TeamAccess | undefined => {
    return pendingAccessList.find(p => p.team_id === teamId);
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  Manage Team Access for {user.email}
                </Dialog.Title>

                {error && (
                  <div className="my-4 p-4 bg-red-100 text-red-700 rounded-md border border-red-300">
                    Error: {error}
                  </div>
                )}

                {loading && teams.length === 0 ? (
                  <div className="mt-4 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="overflow-x-auto relative shadow-md sm:rounded-lg border border-gray-200">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3">Team Name</th>
                            {/* Use simplified access flags */}
                            {teamAccessFlags.map(flag => (
                              <th key={flag.key} scope="col" className="px-6 py-3 text-center">
                                {flag.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teams.length === 0 && !loading && (
                            <tr>
                                <td colSpan={teamAccessFlags.length + 1} className="px-6 py-4 text-center text-gray-500">
                                    No teams found. Please create teams first in the Company Structure section.
                                </td>
                            </tr>
                          )}
                          {teams.map((team) => {
                            const currentAccess = getPendingAccessForTeam(team.id);
                            const isReadChecked = currentAccess?.can_read || false;
                            const isWriteChecked = currentAccess?.can_write || false;
                            const isReadDisabled = isWriteChecked || loading;

                            return (
                              <tr key={team.id} className="bg-white border-b hover:bg-gray-50">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                  {team.name}
                                </th>
                                {/* Generate checkboxes for read/write access */}
                                {teamAccessFlags.map(flag => (
                                  <td key={flag.key} className="px-6 py-4 text-center">
                                    <input
                                      type="checkbox"
                                      id={`access-${team.id}-${flag.key}`}
                                      checked={flag.key === 'can_read' ? isReadChecked : isWriteChecked}
                                      onChange={(e) => handlePendingAccessChange(team.id, flag.key, e.target.checked)}
                                      disabled={flag.key === 'can_read' ? isReadDisabled : loading}
                                      className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${flag.key === 'can_read' && isReadDisabled && !loading ? 'cursor-not-allowed opacity-50' : ''}`}
                                      aria-labelledby={`label-${team.id}-${flag.key}`}
                                      aria-describedby={`desc-${team.id}`}
                                    />
                                    <label id={`label-${team.id}-${flag.key}`} htmlFor={`access-${team.id}-${flag.key}`} className="sr-only">
                                        {flag.label} for {team.name}
                                    </label>
                                  </td>
                                ))}
                                <td id={`desc-${team.id}`} className="sr-only">Access permissions for team {team.name}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  {loading && <span className="text-sm text-gray-500 italic">Saving...</span>}
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    Save
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 