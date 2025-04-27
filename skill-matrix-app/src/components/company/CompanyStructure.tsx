'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import AddItemModal from './AddItemModal';
import { Fragment } from 'react';
import { useUser } from '@/hooks/useUser';
import DeleteConfirmationModal from '../layout/DeleteConfirmationModal';
import { TeamAccess } from '@/lib/schema';
import { getUserTeamAccess } from '@/lib/teamAccess';
import BulkAddEmployeesModal from './BulkAddEmployeesModal';

// Use specific schema types only where needed (e.g. function signatures, modal props if strict)
// import { Department as BaseDepartment, ProductionLine as BaseProductionLine, Team as BaseTeam, Employee as BaseEmployee } from '@/lib/schema'; 

// --- Reintroduce local interfaces reflecting the nested query structure ---
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  contract_type: string;
  team_id: string; // Ensure this is selected in the query
  // Add other fields if selected/needed
}

interface Team {
  id: string;
  name: string;
  production_line_id: string; // Ensure this is selected
  employees: Employee[]; // Nested employees
  // Add other fields if selected/needed
}

interface ProductionLine {
  id: string;
  name: string;
  department_id: string; // Ensure this is selected
  teams: Team[]; // Nested teams
  // Add other fields if selected/needed
}

interface Department {
  id: string;
  name: string;
  production_lines: ProductionLine[]; // Nested production lines
  // Add other fields if selected/needed
}

type ItemType = 'department' | 'production_line' | 'team' | 'employee';

interface DeleteItem {
  type: ItemType;
  id: string;
  name: string;
}

interface TeamStatistics {
  total: number;
  leadership: number;
  workforce: number;
  permanent: number;
  temporary: number;
}

const calculateTeamStatistics = (employees: Employee[]): TeamStatistics => {
  return employees.reduce((stats, employee) => {
    stats.total++;
    if (employee.role === 'Hancho' || employee.role === 'Teamleader') {
      stats.leadership++;
    } else if (employee.role === 'Trainer' || employee.role === 'Operator') {
      stats.workforce++;
    }
    if (employee.contract_type === 'Permanent') {
      stats.permanent++;
    } else if (employee.contract_type === 'Temporary') {
      stats.temporary++;
    }
    return stats;
  }, { total: 0, leadership: 0, workforce: 0, permanent: 0, temporary: 0 });
};

export default function CompanyStructure() {
  const { user, isAdmin } = useUser();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userTeamAccess, setUserTeamAccess] = useState<TeamAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ItemType | null>(null);
  const [parentId, setParentId] = useState<string>();
  const [itemToDelete, setItemToDelete] = useState<DeleteItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Department | ProductionLine | Team | Employee | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);
  const [bulkAddTeamId, setBulkAddTeamId] = useState<string | null>(null);

  const canViewTeam = useCallback((teamId: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return userTeamAccess.some(access => access.team_id === teamId && access.can_read);
  }, [user, isAdmin, userTeamAccess]);

  const canWriteTeam = useCallback((teamId: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return userTeamAccess.some(access => access.team_id === teamId && access.can_write);
  }, [user, isAdmin, userTeamAccess]);

  const hasAnyWriteAccess = useCallback((): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return userTeamAccess.some(access => access.can_write);
  }, [user, isAdmin, userTeamAccess]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments' as const)
        .select(`
          id,
          name,
          production_lines (
            id,
            name,
            department_id,
            teams (
              id,
              name,
              production_line_id,
              employees (
                id,
                first_name,
                last_name,
                role,
                contract_type,
                team_id
              )
            )
          )
        `);

      if (departmentsError) throw departmentsError;

      setDepartments((departmentsData as Department[]) || []);
    } catch (error: unknown) {
      console.error('Error in fetchData:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch company structure');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserAccess = useCallback(async () => {
    if (!user) {
      setUserTeamAccess([]);
      setLoadingPermissions(false);
      return;
    }
    setLoadingPermissions(true);
    try {
      console.log('(CompanyStructure) Fetching user team access for:', user.id);
      const accessList = await getUserTeamAccess(user.id);
      setUserTeamAccess(accessList);
      console.log('(CompanyStructure) User team access fetched:', accessList);
    } catch (err: unknown) {
      console.error('(CompanyStructure) Error fetching user team access:', err);
      setError('Failed to fetch user permissions');
      setUserTeamAccess([]);
    } finally {
      setLoadingPermissions(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (user) {
      console.log('(CompanyStructure) User found, calling fetchData and fetchUserAccess...');
      fetchData();
      fetchUserAccess();
    } else {
      console.log('No user, clearing data...');
      setDepartments([]);
      setUserTeamAccess([]);
      setLoading(true);
      setLoadingPermissions(true);
    }
  }, [user, fetchData, fetchUserAccess]);

  const handleAddClick = (type: ItemType, parentId?: string) => {
    setItemToEdit(null);
    let canAdd = false;
    if (type === 'department' || type === 'production_line') {
      canAdd = isAdmin;
    } else if (type === 'team') {
      canAdd = isAdmin || hasAnyWriteAccess();
    } else if (type === 'employee' && parentId) {
      canAdd = isAdmin || canWriteTeam(parentId);
    }

    if (!canAdd) {
      setError('You do not have permission to add this item.');
      console.error('Permission denied for add action:', type, parentId);
      return;
    }

    setModalType(type);
    setParentId(parentId || '');
    setIsModalOpen(true);
  };

  const handleItemClick = async (type: ItemType, item: unknown) => {
    switch (type) {
      case 'department':
        break;
      case 'production_line':
        break;
      case 'team':
        if (canViewTeam(item as string)) {
          console.log("Selected team:", item);
        } else {
          console.warn("Attempted to select a team without view permission:", item);
        }
        break;
      case 'employee':
        console.log("Selected employee:", item);
        break;
    }
  };

  const handleDeleteClick = (type: ItemType, id: string, name: string) => {
    let canDelete = false;
    if (type === 'department' || type === 'production_line') {
      canDelete = isAdmin;
    } else if (type === 'team') {
      canDelete = isAdmin || canWriteTeam(id);
    } else if (type === 'employee') {
      console.warn("Employee delete permission check needs refinement (requires team_id)");
      let employeeTeamId: string | undefined;
      departments.forEach(dep => dep.production_lines.forEach(pl => pl.teams.forEach(t => {
        if (t.employees.some(emp => emp.id === id)) {
          employeeTeamId = t.id;
        }
      })));

      if (employeeTeamId) {
        canDelete = isAdmin || canWriteTeam(employeeTeamId);
      } else {
        canDelete = isAdmin;
        console.error(`Could not find team for employee ${id} to check delete permissions.`);
      }
    }

    if (!canDelete) {
      setError('You do not have permission to delete this item.');
      console.error('Permission denied for delete action:', type, id);
      return;
    }

    setItemToDelete({ type, id, name });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    const { type, id } = itemToDelete;

    let canDelete = false;
    if (type === 'department' || type === 'production_line') {
      canDelete = isAdmin;
    } else if (type === 'team') {
      canDelete = isAdmin || canWriteTeam(id);
    } else if (type === 'employee') {
      let employeeTeamId: string | undefined;
      departments.forEach(dep => dep.production_lines.forEach(pl => pl.teams.forEach(t => {
        if (t.employees.some(emp => emp.id === id)) {
          employeeTeamId = t.id;
        }
      })));
      if (employeeTeamId) {
        canDelete = isAdmin || canWriteTeam(employeeTeamId);
      } else {
        canDelete = isAdmin;
      }
    }

    if (!canDelete) {
      setError('Permission denied for delete action.');
      setShowDeleteModal(false);
      setItemToDelete(null);
      return;
    }

    setLoading(true);
    try {
      let tableName: 'departments' | 'production_lines' | 'teams' | 'employees';
      switch (type) {
        case 'department':
          tableName = 'departments';
          break;
        case 'production_line':
          tableName = 'production_lines';
          break;
        case 'team':
          tableName = 'teams';
          break;
        case 'employee':
          tableName = 'employees';
          break;
        default:
          throw new Error('Invalid item type for deletion');
      }

      const { error: deleteError } = await supabase.from(tableName).delete().eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await fetchData();

    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setError(`Failed to delete ${type}. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalType(null);
    setParentId(undefined);
    setItemToEdit(null);
  };

  const handleSuccess = () => {
    handleModalClose();
    fetchData();
  };

  const handleEditClick = (type: ItemType, item: Department | ProductionLine | Team | Employee) => {
    let canEdit = false;
    if (type === 'department' || type === 'production_line') {
      canEdit = isAdmin;
    } else if (type === 'team') {
      canEdit = isAdmin || canWriteTeam(item.id);
    } else if (type === 'employee') {
      const employeeItem = item as Employee;
      canEdit = isAdmin || canWriteTeam(employeeItem.team_id);
    }

    if (!canEdit) {
      setError('You do not have permission to edit this item.');
      console.error('Permission denied for edit action:', type, item.id);
      return;
    }

    console.log("Editing item:", type, item);
    setModalType(type);
    setItemToEdit(item);
    setParentId(undefined);
    setIsModalOpen(true);
  };

  const handleToggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleBulkAddClick = (teamId: string) => {
    setBulkAddTeamId(teamId);
    setBulkAddModalOpen(true);
  };

  if (loading || loadingPermissions) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Loading Company Structure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-100" role="alert">
        <span className="font-medium">Error:</span> {error}
      </div>
    );
  }

  if (!isAdmin && userTeamAccess.length === 0 && !loadingPermissions) {
    return (
      <div className="p-4 my-4 text-sm text-yellow-800 rounded-lg bg-yellow-100" role="alert">
        <span className="font-medium">No Access:</span> You currently do not have permission to view any teams. Please contact an administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Department Button */} 
      {isAdmin && (
         <div className="flex justify-start mb-4">
             <button
                 onClick={() => handleAddClick('department')}
                 className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
             >
                 + Add Department
             </button>
         </div>
      )}

      {/* Departments List */} 
      <div className="space-y-4">
        {departments.length === 0 && !loading && (
             <p className="text-center text-gray-500 mt-6 py-4">No departments found. {isAdmin ? "Start by adding a department." : "Contact an admin."}</p>
        )}
        {departments.map((department) => {
          const isDepartmentExpanded = expandedItems.has(department.id);
          const hasProductionLines = department.production_lines.length > 0;
          return (
            // Department Card
            <div key={department.id} className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-gray-100 border-b border-gray-200">
                <div className="flex items-center flex-grow">
                  {/* Department Expand/Collapse Toggle */} 
                  <button 
                    onClick={() => hasProductionLines && handleToggleExpand(department.id)}
                    className={`mr-2 w-5 h-5 flex items-center justify-center text-gray-500 ${!hasProductionLines ? 'cursor-default opacity-0' : 'hover:text-gray-800'}`}
                  >
                    {hasProductionLines ? (isDepartmentExpanded ? '▼' : '▶') : ''}
                  </button>
                  <h3 className="text-xl font-semibold text-gray-800 cursor-pointer hover:text-indigo-600" onClick={() => handleItemClick('department', department)}>
                    {department.name}
                  </h3>
                </div>
                {/* Department Actions */} 
                {isAdmin && (
                 <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handleAddClick('production_line', department.id)}
                        className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        title="Add Production Line"
                    >
                        + Line
                    </button>
                    <button
                        onClick={() => handleDeleteClick('department', department.id, department.name)}
                        className="text-xs font-medium px-2.5 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Delete Department"
                    >
                        Delete
                    </button>
                 </div>
               )}
              </div>

              {/* Production Lines Container - Conditionally Rendered */} 
              {isDepartmentExpanded && hasProductionLines && (
                <div id={`department-content-${department.id}`} className="p-4 space-y-3">
                  {department.production_lines.map((productionLine) => {
                    const isPLExpanded = expandedItems.has(productionLine.id);
                    const accessibleTeams = productionLine.teams.filter(team => canViewTeam(team.id));
                    const hasAccessibleTeams = accessibleTeams.length > 0;
                    return (
                      // Production Line Card
                      <div key={productionLine.id} className="bg-white border border-gray-200 rounded-md shadow-xs overflow-hidden">
                        <div className="flex justify-between items-center p-3 bg-white border-b border-gray-100">
                          <div className="flex items-center flex-grow">
                             {/* Production Line Expand/Collapse Toggle */} 
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleExpand(productionLine.id); }}
                                className="ml-2 text-xs text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded"
                             >
                               {isPLExpanded ? 'Collapse' : 'Expand'}
                             </button>
                             <h4 className="text-lg font-medium text-gray-700 cursor-pointer hover:text-indigo-600" onClick={() => handleItemClick('production_line', productionLine)}>
                               {productionLine.name}
                             </h4>
                          </div>
                          {/* Production Line Actions */} 
                          {isAdmin && (
                              <div className="flex items-center space-x-2">
                                  <button
                                      onClick={(e) => { e.stopPropagation(); handleAddClick('team', productionLine.id); }}
                                      className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                      title="Add Team"
                                  >
                                      + Team
                                  </button>
                                  <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteClick('production_line', productionLine.id, productionLine.name); }}
                                      className="text-xs font-medium px-2.5 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                      title="Delete Production Line"
                                  >
                                      Delete
                                  </button>
                              </div>
                          )}
                        </div>

                        {/* Teams Container - Conditionally Rendered */} 
                        {isPLExpanded && hasAccessibleTeams && (
                          <div id={`pl-content-${productionLine.id}`} className="p-3 space-y-2">
                            {/* Map over accessibleTeams */} 
                            {accessibleTeams.map((team) => {
                              const isTeamExpanded = expandedItems.has(team.id);
                              const hasEmployees = team.employees.length > 0;
                              return (
                                // Team Card
                                <div key={team.id} className="bg-gray-50 border border-gray-100 rounded p-3">
                                  <div className="flex justify-between items-center mb-2">
                                     <div className="flex items-center flex-grow">
                                         {/* Team Expand/Collapse Toggle */} 
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleExpand(team.id); }}
                                            className="ml-2 text-xs text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded"
                                         >
                                           {isTeamExpanded ? 'Collapse' : 'Expand'}
                                         </button>
                                         <h5 className="text-base font-medium text-gray-600 cursor-pointer hover:text-indigo-600" onClick={() => handleItemClick('team', team)}>
                                           {team.name}
                                         </h5>
                                         {/* Add team statistics */}
                                         {team.employees && (
                                           <div className="ml-3 flex items-center space-x-2 text-xs">
                                             {(() => {
                                               const stats = calculateTeamStatistics(team.employees);
                                               return (
                                                 <>
                                                   <div className="flex items-center space-x-2">
                                                     {/* Total count with icon */}
                                                     <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full font-medium shadow-sm" title="Total Team Members">
                                                       <svg className="w-3.5 h-3.5 text-gray-500 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Total Members">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                       </svg>
                                                       <span className="text-gray-700">{stats.total}</span>
                                                     </span>

                                                     {/* Roles breakdown */}
                                                     <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full font-medium shadow-sm">
                                                       <span className="text-blue-700 mr-1.5" title="Leadership (Hancho + Teamleader)">
                                                         <svg className="w-3.5 h-3.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Leadership">
                                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                         </svg>
                                                         {stats.leadership}
                                                       </span>
                                                       <span className="text-green-700" title="Workforce (Trainer + Operator)">
                                                         <svg className="w-3.5 h-3.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Workforce">
                                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                         </svg>
                                                         {stats.workforce}
                                                       </span>
                                                     </span>

                                                     {/* Contract types */}
                                                     <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full font-medium shadow-sm">
                                                       <span className="text-purple-700 mr-1.5" title="Permanent Employees">
                                                         <svg className="w-3.5 h-3.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Permanent">
                                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                         </svg>
                                                         {stats.permanent}
                                                       </span>
                                                       <span className="text-orange-700" title="Temporary Employees">
                                                         <svg className="w-3.5 h-3.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Temporary">
                                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                         </svg>
                                                         {stats.temporary}
                                                       </span>
                                                     </span>
                                                   </div>
                                                 </>
                                               );
                                             })()}
                                           </div>
                                         )}
                                     </div>
                                    {/* Team Actions */} 
                                    {(isAdmin || canWriteTeam(team.id)) && (
                                        <div className="flex items-center space-x-1.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAddClick('employee', team.id); }}
                                                className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                title="Add Employee"
                                            >
                                                + Emp
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleBulkAddClick(team.id); }}
                                                className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                title="Bulk Add Employees"
                                                aria-label="Bulk Add Employees"
                                                tabIndex={0}
                                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleBulkAddClick(team.id); } }}
                                            >
                                                Bulk Add
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditClick('team', team); }}
                                                className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                title="Edit Team"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick('team', team.id, team.name); }}
                                                className="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                title="Delete Team"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                  </div>

                                  {/* Employees List - Conditionally Rendered */} 
                                  {isTeamExpanded && hasEmployees && (
                                    <ul id={`team-content-${team.id}`} className="pl-8 space-y-1 border-l border-gray-200 ml-2.5">
                                        {team.employees.map((employee) => (
                                          <li key={employee.id} className="flex justify-between items-center text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded">
                                            <span className="cursor-pointer" onClick={() => handleItemClick('employee', employee)}>
                                                {employee.first_name} {employee.last_name}
                                                <span className="text-xs text-gray-500 ml-2">({employee.role} - {employee.contract_type})</span>
                                            </span>
                                            {(isAdmin || canWriteTeam(team.id)) && (
                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick('employee', employee); }}
                                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 px-1"
                                                        title="Edit Employee"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick('employee', employee.id, `${employee.first_name} ${employee.last_name}`); }}
                                                        className="text-xs font-medium text-red-500 hover:text-red-700 ml-2 px-1"
                                                        title="Delete Employee"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            )}
                                          </li>
                                        ))}
                                    </ul>
                                  )}
                                  {/* Show message if expanded but no employees */} 
                                  {isTeamExpanded && !hasEmployees && (
                                      <p className="pl-8 text-sm text-gray-400 italic py-1 ml-2.5">No employees assigned</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                         {/* Message if PL is expanded but no accessible teams */} 
                         {isPLExpanded && !hasAccessibleTeams && !loadingPermissions && (
                            <p className="text-xs text-gray-500 italic px-3 pb-2 pt-1">No teams accessible or assigned in this production line.</p>
                         )}
                      </div>
                    );
                  })}
                  {department.production_lines.length === 0 && (
                      <p className="text-sm text-gray-500 italic px-2 py-1">No production lines in this department.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals (Keep these) */} 
      {isModalOpen && modalType && (
        <AddItemModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
          type={modalType}
          parentId={parentId}
          itemToEdit={itemToEdit}
        />
      )}
      {showDeleteModal && itemToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          itemName={itemToDelete.name}
          itemType={itemToDelete.type}
        />
      )}
      {bulkAddModalOpen && bulkAddTeamId && (
        <BulkAddEmployeesModal
          isOpen={bulkAddModalOpen}
          onClose={() => setBulkAddModalOpen(false)}
          onSuccess={fetchData}
          teamId={bulkAddTeamId}
        />
      )}
    </div>
  );
} 