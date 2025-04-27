'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AddStationModal from './AddStationModal';
import { Loader2 } from 'lucide-react';

type Station = {
  id: string;
  name: string;
  department_id: string | null;
  created_at: string;
  updated_at?: string;
};

type ProductionLine = {
  id: string;
  name: string;
  department_id: string | null;
  created_at: string;
  updated_at?: string;
};

type Department = {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  production_lines: ProductionLine[];
  stations: Station[];
};

type StructuredDepartment = Department;

export default function StationsView() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<StructuredDepartment[]>([]);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) {
        if (!isRefreshing) setIsRefreshing(true); 
    } else {
        setIsLoading(true);
    }
    setError(null);

    try {
      const [departmentsResult, productionLinesResult, stationsResult] = await Promise.all([
        supabase.from('departments').select('*'),
        supabase.from('production_lines').select('*'),
        supabase.from('stations').select('*')
      ]);

      if (departmentsResult.error) throw new Error(`Departments: ${departmentsResult.error.message}`);
      if (productionLinesResult.error) throw new Error(`Production Lines: ${productionLinesResult.error.message}`);
      if (stationsResult.error) throw new Error(`Stations: ${stationsResult.error.message}`);

      const allDepartments = departmentsResult.data || [];
      const allProductionLines = productionLinesResult.data || [];
      const allStations = (stationsResult.data || []) as Array<Partial<Station> & { id: string }>;

      const structured: StructuredDepartment[] = allDepartments.map(dept => {
        const deptProductionLines = allProductionLines.filter(pl => pl.department_id && pl.department_id === dept.id);
        const deptStations = allStations.filter(s => s.department_id && s.department_id === dept.id) as Station[];
        return {
          ...dept,
          production_lines: deptProductionLines,
          stations: deptStations
        };
      });

      setDepartments(structured);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      if (isInitialLoad) setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  useEffect(() => {
    if (user) {
      fetchData(true);
    }
  }, [user, fetchData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('stations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stations' },
        () => {
          fetchData();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          setError(`Real-time connection error: ${err.message}. Data may not update automatically.`);
        }
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates.');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError(`Real-time connection issue: ${status}. Data may not update automatically.`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  const handleDepartmentToggle = (departmentId: string) => {
    setExpandedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(departmentId)) next.delete(departmentId);
      else next.add(departmentId);
      return next;
    });
  };

  const handleAddStationClick = (departmentId: string) => {
    if (isDeleting || isRefreshing) return;
    setSelectedDepartmentId(departmentId);
    setShowAddModal(true);
  };

  const handleModalClose = useCallback(() => {
    setShowAddModal(false);
    setSelectedDepartmentId(null);
  }, []);

  const handleModalSuccess = useCallback((newStationName: string) => {
    console.log(`Station "${newStationName}" added successfully via modal.`);
  }, []);

  const handleDeleteStation = async (stationId: string) => {
    if (isDeleting || isRefreshing) return;

    if (!confirm('Are you sure you want to delete this station?')) return;

    setIsDeleting(stationId);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('stations')
        .delete()
        .eq('id', stationId);

      if (deleteError) {
        throw deleteError;
      }

    } catch (err: unknown) {
      setError(`Failed to delete station: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center border border-red-200 bg-red-50 rounded-md">
        <p className="text-red-700 font-semibold mb-2">An Error Occurred</p>
        <p className="text-red-600 mb-4 text-sm">{error}</p>
        <button
          onClick={() => fetchData(true)}
          className="px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Retrying...' : 'Try Again'}
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="p-4 text-center text-gray-600">Only administrators can view and manage stations.</div>;
  }

  return (
    <div className="p-4 relative">
      {isRefreshing && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Updating...</span>
        </div>
      )}
      
      <h2 className="text-2xl font-bold mb-4">Stations Management</h2>
      
      {departments.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-4">No departments found.</div>
      )}

      <div className="space-y-4">
        {departments.map(department => (
          <div key={department.id} className={`border rounded-lg p-4 transition-opacity duration-300 ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
            <button
              onClick={() => handleDepartmentToggle(department.id)}
              className="flex items-center justify-between w-full text-left font-semibold mb-2"
              disabled={!!isDeleting}
            >
              <span>{department.name}</span>
              <span className="text-xl font-light">{expandedDepartments.has(department.id) ? '−' : '+'}</span>
            </button>
            
            {expandedDepartments.has(department.id) && (
              <div className="pl-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                {isAdmin && (
                  <div className="mb-3">
                    <button
                      onClick={() => handleAddStationClick(department.id)}
                      className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      disabled={!!isDeleting || isRefreshing}
                      aria-label={`Add station to ${department.name}`}
                    >
                      Add Station
                    </button>
                  </div>
                )}

                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Stations:</h4>
                {department.stations.length === 0 ? (
                  <div className="text-sm text-gray-400 italic">No stations defined for this department.</div>
                ) : (
                  <ul className="space-y-2">
                    {department.stations.map(station => (
                      <li key={station.id} className={`flex items-center justify-between text-sm transition-opacity duration-300 ${isDeleting === station.id ? 'opacity-50' : 'opacity-100'}`}>
                        <span>{station.name}</span>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteStation(station.id)}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!!isDeleting || isRefreshing}
                            aria-label={`Delete station ${station.name}`}
                          >
                            {isDeleting === station.id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && selectedDepartmentId && (
        <AddStationModal
          departmentId={selectedDepartmentId}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
} 