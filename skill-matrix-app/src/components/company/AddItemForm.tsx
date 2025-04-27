'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

// Define local types needed for itemToEdit, mirroring AddItemModal
interface Department { id: string; name: string; /* other fields */ }
interface ProductionLine { id: string; name: string; department_id: string; /* other fields */ }
interface Team { id: string; name: string; production_line_id: string; /* other fields */ }
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  contract_type: string;
  team_id: string;
  // Add other fields if needed
}

type AddItemFormProps = {
  type: 'department' | 'production_line' | 'team' | 'employee';
  parentId?: string;
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit?: Department | ProductionLine | Team | Employee | null; // Add optional prop
};

export default function AddItemForm({ type, parentId, onClose, onSuccess, itemToEdit }: AddItemFormProps) {
  // Adjust state to hold all possible fields
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Operator'); // Default role
  const [contractType, setContractType] = useState('Permanent'); // Default contract type
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!itemToEdit;

  // Effect to pre-fill form when editing
  useEffect(() => {
    // Reset form fields initially or when itemToEdit/type changes
    setName('');
    setFirstName('');
    setLastName('');
    setRole('Operator');
    setContractType('Permanent');
    
    if (itemToEdit) { // Check if itemToEdit is not null/undefined
        switch (type) {
          case 'department':
          case 'production_line':
          case 'team':
              // These types have a 'name' property
              setName((itemToEdit as Department | ProductionLine | Team).name || '');
              break;
          case 'employee':
              // Employee type has different properties
              const emp = itemToEdit as Employee;
              setFirstName(emp.first_name || '');
              setLastName(emp.last_name || '');
              setRole(emp.role || 'Operator');
              setContractType(emp.contract_type || 'Permanent');
              break;
        }
    }
    // No 'else' needed here, fields are reset at the start of the effect
  }, [itemToEdit, type]); // isEditing is derived, no need to include

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
      setLoading(true);
      setError(null);

    try {
      let result;
      const employeeData = { first_name: firstName, last_name: lastName, role, contract_type: contractType };

      if (isEditing && itemToEdit) {
        // --- UPDATE Logic ---
        let updateData: Record<string, unknown> = {};
        switch (type) {
          case 'department': 
               updateData = { name }; 
               break;
          case 'production_line': 
               updateData = { name }; // Assuming only name is editable for now
               break;
          case 'team': 
               updateData = { name }; // Assuming only name is editable
               break;
          case 'employee': 
               updateData = employeeData; 
               break;
        }
        
        result = await supabase
          .from(type === 'department' ? 'departments' : type === 'production_line' ? 'production_lines' : type === 'team' ? 'teams' : 'employees')
          .update(updateData)
          .eq('id', itemToEdit.id);
          
      } else {
        // --- INSERT Logic ---
        switch (type) {
          case 'department': 
               result = await supabase
                 .from('departments')
                 .insert([{ name }]);
               break;
          case 'production_line': 
               if (!parentId) throw new Error("Parent ID is required for this item type.");
               result = await supabase
                 .from('production_lines')
                 .insert([{ name, department_id: parentId }]);
               break;
          case 'team': 
               if (!parentId) throw new Error("Parent ID is required for this item type.");
               result = await supabase
                 .from('teams')
                 .insert([{ name, production_line_id: parentId }]);
               break;
          case 'employee': 
               if (!parentId) throw new Error("Parent ID is required for this item type.");
               result = await supabase
                 .from('employees')
                 .insert([{ ...employeeData, team_id: parentId }]);
               break;
        }
      }

      const { error: dbError } = result;

      if (dbError) {
        throw dbError;
      }

      onSuccess(); // Call success callback (refetches data in parent)
      onClose(); // Close the modal

    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} ${type}:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'add'} item.`);
    } finally {
      setLoading(false);
    }
  };

  // Render different form fields based on type
  const renderFormFields = () => {
    switch (type) {
      case 'department':
      case 'production_line':
      case 'team':
  return (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        );
      case 'employee':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
              <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1 input-field" />
          </div>
          <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
              <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 input-field" />
          </div>
          <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} required className="mt-1 select-field">
              <option value="Operator">Operator</option>
              <option value="Trainer">Trainer</option>
              <option value="Hancho">Hancho</option>
              <option value="Teamleader">Teamleader</option>
            </select>
          </div>
          <div>
              <label htmlFor="contractType" className="block text-sm font-medium text-gray-700">Contract Type</label>
              <select id="contractType" value={contractType} onChange={(e) => setContractType(e.target.value)} required className="mt-1 select-field">
              <option value="Permanent">Permanent</option>
              <option value="Temporary">Temporary</option>
            </select>
          </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-red-600 text-sm">Error: {error}</p>}
      
      {renderFormFields()}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-indigo-300"
        >
          {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Item')}
        </button>
      </div>
      {/* Basic CSS for input fields - consider moving to a global CSS or Tailwind apply */}
      <style jsx>{`
        .input-field, .select-field {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db; /* gray-300 */
          border-radius: 0.375rem; /* rounded-md */
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        .input-field:focus, .select-field:focus {
          outline: none;
          border-color: #6366f1; /* indigo-500 */
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); /* focus:ring-indigo-500 */
        }
        .select-field {
            appearance: none; /* Optional: for custom dropdown arrow styling */
            background-color: white;
        }
      `}</style>
    </form>
  );
} 