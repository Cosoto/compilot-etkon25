import { Fragment, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase/client';

interface BulkAddEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teamId: string;
}

const REQUIRED_COLUMNS = ['first_name', 'last_name', 'role', 'contract_type'];
const ROLE_OPTIONS = ['Operator', 'Trainer', 'Hancho', 'Teamleader'];
const CONTRACT_TYPE_OPTIONS = ['Permanent', 'Temporary'];

// Define a type for employee rows
interface BulkEmployeeRow {
  first_name: string;
  last_name: string;
  role: string;
  contract_type: string;
  [key: string]: unknown;
}

export const BulkAddEmployeesModal = ({ isOpen, onClose, onSuccess, teamId }: BulkAddEmployeesModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<BulkEmployeeRow[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setPreviewRows([]);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    try {
      let employees: BulkEmployeeRow[] = [];
      if (file.name.endsWith('.csv')) {
        employees = await parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        employees = await parseExcel(file);
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
      }
      validateRows(employees);
      setPreviewRows(employees.slice(0, 3));
      await bulkInsert(employees);
      setSuccess(`Successfully added ${employees.length} employees.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process file.');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseCSV = (file: File): Promise<BulkEmployeeRow[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length) {
            reject(new Error('CSV parsing error.'));
          } else {
            resolve(results.data as BulkEmployeeRow[]);
          }
        },
        error: (err) => reject(err),
      });
    });
  };

  const parseExcel = (file: File): Promise<BulkEmployeeRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(json as BulkEmployeeRow[]);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const normalizeHeader = (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_');

  const mapRowKeys = (row: unknown): BulkEmployeeRow => {
    const mapped: BulkEmployeeRow = {} as BulkEmployeeRow;
    if (typeof row === 'object' && row !== null) {
      for (const key in row) {
        const norm = normalizeHeader(key);
        mapped[norm] = (row as Record<string, unknown>)[key];
      }
    }
    return mapped;
  };

  const isRowEmpty = (row: BulkEmployeeRow) => REQUIRED_COLUMNS.every(col => !row[col] || (typeof row[col] === 'string' && row[col].toString().trim() === ''));

  const validateRows = (rows: BulkEmployeeRow[]) => {
    if (!rows.length) throw new Error('No data found in file.');
    // Normalize headers and skip empty rows
    const normalizedRows = rows.map(mapRowKeys).filter(row => !isRowEmpty(row));
    if (!normalizedRows.length) throw new Error('No valid data rows found in file.');
    for (const col of REQUIRED_COLUMNS) {
      if (!(col in normalizedRows[0])) throw new Error(`Missing required column: ${col}`);
    }
    for (const [i, row] of normalizedRows.entries()) {
      // Trim all string values in the row
      for (const key in row) {
        if (typeof row[key] === 'string') {
          row[key] = (row[key] as string).trim();
        }
      }
      for (const col of REQUIRED_COLUMNS) {
        if (!row[col]) throw new Error(`Row ${i + 2}: Missing value for ${col}. Row content: ${JSON.stringify(row)}`);
      }
      // Case-insensitive match for role
      const roleMatch = ROLE_OPTIONS.find(opt => opt.toLowerCase() === String(row.role).toLowerCase());
      if (!roleMatch) throw new Error(`Row ${i + 2}: Invalid role. Allowed: ${ROLE_OPTIONS.join(', ')}. Row content: ${JSON.stringify(row)}`);
      row.role = roleMatch;
      // Case-insensitive match for contract_type
      const contractTypeMatch = CONTRACT_TYPE_OPTIONS.find(opt => opt.toLowerCase() === String(row.contract_type).toLowerCase());
      if (!contractTypeMatch) throw new Error(`Row ${i + 2}: Invalid contract_type. Allowed: ${CONTRACT_TYPE_OPTIONS.join(', ')}. Row content: ${JSON.stringify(row)}`);
      row.contract_type = contractTypeMatch;
    }
    // Replace original rows with normalized/cleaned ones
    rows.length = 0;
    normalizedRows.forEach(r => rows.push(r));
  };

  const bulkInsert = async (rows: BulkEmployeeRow[]) => {
    const employees = rows.map(row => ({
      first_name: row.first_name,
      last_name: row.last_name,
      role: row.role,
      contract_type: row.contract_type,
      team_id: teamId,
    }));
    const { error } = await supabase.from('employees').insert(employees);
    if (error) throw error;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Bulk Add Employees
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-2">
                    Upload a CSV or Excel file with the following columns:
                  </p>
                  <ul className="mb-2 text-xs text-gray-700 list-disc list-inside">
                    <li><b>first_name</b> (required)</li>
                    <li><b>last_name</b> (required)</li>
                    <li><b>role</b> (Operator, Trainer, Hancho, Teamleader)</li>
                    <li><b>contract_type</b> (Permanent, Temporary)</li>
                  </ul>
                  <div className="mb-2 text-xs text-gray-500">
                    Example:<br />
                    <code>first_name,last_name,role,contract_type</code><br />
                    <code>John,Doe,Operator,Permanent</code>
                  </div>
                  <div className="mb-2 text-xs text-blue-600">
                    <b>Note:</b> Please save your file as <b>UTF-8</b> to ensure special characters (e.g., ü, ö, ä, ß) are displayed correctly.
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                    onChange={handleFileChange}
                    aria-label="Upload CSV or Excel file"
                    disabled={parsing}
                  />
                  {fileName && <div className="mt-1 text-xs text-gray-500">Selected: {fileName}</div>}
                  {previewRows.length > 0 && previewRows[0] && (
                    <div className="mt-2 text-xs">
                      <b>Preview (first 3 rows):</b>
                      <table className="mt-1 w-full border text-xs">
                        <thead>
                          <tr>
                            {Object.keys(previewRows[0]).map((col) => (
                              <th key={col} className="border px-1 py-0.5 bg-gray-50">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr key={i}>
                              {Object.keys(previewRows[0]).map((col) => (
                                <td key={col} className="border px-1 py-0.5">{`${row[col] ?? ''}`}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
                  {success && <div className="mt-2 text-xs text-green-600">{success}</div>}
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                    disabled={parsing}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BulkAddEmployeesModal; 