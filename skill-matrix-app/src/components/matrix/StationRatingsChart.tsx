import { useState, useMemo, useEffect } from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import React from 'react';

interface ChartRatingData {
  department: string;
  team: string;
  station: string;
  averageRating: number;
  ratingCount: number;
}

interface Props {
  data: ChartRatingData[];
  isAdmin: boolean;
  userTeam?: string;
  allDepartments: { id: string; name: string }[];
  allProductionLines: { id: string; name: string; department_id: string | null }[];
  allTeams: { id: string; name: string; production_line_id: string | null; department_id: string | null }[];
  selectedDepartment: string;
  setSelectedDepartment: (value: string) => void;
  selectedProductionLine: string;
  setSelectedProductionLine: (value: string) => void;
  selectedTeam: string;
  setSelectedTeam: (value: string) => void;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) => {
  if (active && payload && Array.isArray(payload) && payload.length > 0) {
    const data = payload[0] as { value: number; name: string };
    return (
      <div className="bg-white p-2 rounded shadow text-xs border border-gray-200">
        <div><b>Station:</b> {label}</div>
        <div><b>Average Skill Rating:</b> {data.value}</div>
        <div><b>Number of Rated Employees:</b> {payload[1] && typeof (payload[1] as { value?: unknown }).value === 'number' ? (payload[1] as { value: number }).value : ''}</div>
      </div>
    );
  }
  return null;
};

export const StationRatingsChart = ({ data, isAdmin, userTeam, allDepartments, allProductionLines, allTeams, selectedDepartment, setSelectedDepartment, selectedProductionLine, setSelectedProductionLine, selectedTeam, setSelectedTeam }: Props) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  useEffect(() => {
    setIsTransitioning(true);
    const timeout = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timeout);
  }, [selectedDepartment, selectedTeam, data.length]);

  const departments = useMemo(() => {
    const deptNames = allDepartments.map(dept => dept.name);
    return ['all', ...new Set(deptNames)];
  }, [allDepartments]);

  const teams = useMemo(() => {
    if (selectedProductionLine === 'all') return ['all', ...allTeams.map(t => t.name)];
    const prodLineId = allProductionLines.find(pl => pl.name === selectedProductionLine)?.id;
    return ['all', ...allTeams.filter(t => t.production_line_id === prodLineId).map(t => t.name)];
  }, [allTeams, allProductionLines, selectedProductionLine]);

  const productionLines = useMemo(() => {
    if (selectedDepartment === 'all') return ['all', ...allProductionLines.map(pl => pl.name)];
    const deptId = allDepartments.find(d => d.name === selectedDepartment)?.id;
    return ['all', ...allProductionLines.filter(pl => pl.department_id === deptId).map(pl => pl.name)];
  }, [allProductionLines, allDepartments, selectedDepartment]);

  useEffect(() => {
    if (selectedProductionLine !== 'all' && !productionLines.includes(selectedProductionLine)) {
      setSelectedProductionLine('all');
    }
  }, [selectedDepartment, productionLines, selectedProductionLine, setSelectedProductionLine]);

  useEffect(() => {
    if (selectedTeam !== 'all' && !teams.includes(selectedTeam)) {
      setSelectedTeam('all');
    }
  }, [selectedProductionLine, teams, selectedTeam, setSelectedTeam]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const departmentMatch = selectedDepartment === 'all' || item.department === selectedDepartment;
      const teamMatch = selectedTeam === 'all' || item.team === selectedTeam;
      const userTeamMatch = isAdmin || !userTeam || item.team === userTeam;
      return departmentMatch && teamMatch && userTeamMatch;
    });
  }, [data, selectedDepartment, selectedTeam, isAdmin, userTeam]);

  const sortedData = useMemo(() => {
    const stationOrder = [
      "Drucker", "Vereinzeln", "OCR", "Hammer", "Biostar", "Laser", "Chiron",
      "Release Agent", "Trowalisieren", "QC", "TouchUP", "Verpacken", "Versand"
    ];
    return filteredData.slice().sort((a, b) => {
      const idxA = stationOrder.indexOf(a.station);
      const idxB = stationOrder.indexOf(b.station);
      if (idxA === -1 && idxB === -1) return a.station.localeCompare(b.station);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [filteredData]);

  // Early return for empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-center">
        No station skill data available to display.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      {isAdmin && (
        <div className="flex flex-wrap gap-4">
          <div className="w-64">
            <Listbox value={selectedDepartment} onChange={setSelectedDepartment}>
              <div className="relative mt-1">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300">
                  <span className="block truncate">
                    {selectedDepartment === 'all' ? 'All Departments' : selectedDepartment}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                  {departments.map((deptName) => (
                    <Listbox.Option
                      key={deptName}
                      value={deptName}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                        }`
                      }
                    >
                      {deptName === 'all' ? 'All Departments' : deptName}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          <div className="w-64">
            <Listbox value={selectedProductionLine} onChange={setSelectedProductionLine}>
              <div className="relative mt-1">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300">
                  <span className="block truncate">
                    {selectedProductionLine === 'all' ? 'All Production Lines' : selectedProductionLine}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                  {productionLines.map((plName) => (
                    <Listbox.Option
                      key={plName}
                      value={plName}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                        }`
                      }
                    >
                      {plName === 'all' ? 'All Production Lines' : plName}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          <div className="w-64">
            <Listbox value={selectedTeam} onChange={setSelectedTeam} disabled={!isAdmin && teams.length <= 1}>
              <div className="relative mt-1">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300">
                  <span className="block truncate">
                    {selectedTeam === 'all' ? 'All Teams' : selectedTeam}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                  {teams.map((team) => (
                    <Listbox.Option
                      key={team}
                      value={team}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                        }`
                      }
                    >
                      {team === 'all' ? 'All Teams' : team}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>
        </div>
      )}

      {/* Chart and Table Section with fade transition */}
      <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Legend above chart */}
        <div className="mb-2 flex flex-wrap items-center gap-8 whitespace-nowrap">
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-indigo-500" aria-label="Average Skill Rating color" />
            <span>Average Skill Rating</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-orange-400" aria-label="Number of Rated Employees color" />
            <span>Number of Rated Employees</span>
          </span>
        </div>
        {/* Chart Section */}
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 100
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="station"
                angle={-30}
                textAnchor="end"
                interval={0}
                height={100}
                tick={{ fontSize: 14, fontWeight: 500 }}
                label={{ value: 'Stations', position: 'insideBottom', offset: -5, fontSize: 16, fontWeight: 600 }}
              />
              <YAxis yAxisId="left" domain={[0, 5]} tickCount={6} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="averageRating"
                fill="#6366f1" // indigo-500
                radius={[4, 4, 0, 0]}
                name="Average Skill Rating"
                barSize={24}
                aria-label="Average Rating Bar"
              />
              <Bar
                yAxisId="right"
                dataKey="ratingCount"
                fill="#f59e42" // orange-400
                radius={[4, 4, 0, 0]}
                name="Number of Rated Employees"
                barSize={24}
                aria-label="Rating Count Bar"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}; 