'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import AddItemForm from './AddItemForm';

// Define local types needed for itemToEdit, or import if consistent
interface Department { id: string; name: string; /* other fields */ }
interface ProductionLine { id: string; name: string; department_id: string; /* other fields */ }
interface Team { id: string; name: string; production_line_id: string; /* other fields */ }
interface Employee { id: string; first_name: string; last_name: string; role: string; contract_type: string; team_id: string; /* other fields */ }

type AddItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'department' | 'production_line' | 'team' | 'employee';
  parentId?: string;
  onSuccess: () => void;
  itemToEdit?: Department | ProductionLine | Team | Employee | null; // Add optional prop
};

export default function AddItemModal({ 
    isOpen, 
    onClose, 
    type, 
    parentId, 
    onSuccess, 
    itemToEdit // Destructure new prop
}: AddItemModalProps) {
  const getTitle = () => {
    switch (type) {
      case 'department':
        return 'Add Department';
      case 'production_line':
        return 'Add Production Line';
      case 'team':
        return 'Add Team';
      case 'employee':
        return 'Add Employee';
      default:
        return 'Add Item';
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {/* Adjust title based on edit mode */}
                  {itemToEdit ? `Edit ${capitalize(type)}` : getTitle()}
                </Dialog.Title>

                <div className="mt-4">
                  <AddItemForm
                    type={type}
                    parentId={parentId}
                    onClose={onClose}
                    onSuccess={onSuccess}
                    itemToEdit={itemToEdit} // Pass itemToEdit down to the form
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Helper function (if not imported)
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1); 