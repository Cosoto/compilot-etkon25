import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

type AddStationModalProps = {
  departmentId: string;
  onClose: () => void;
  onSuccess: (newStationName: string) => void;
};

export default function AddStationModal({ departmentId, onClose, onSuccess }: AddStationModalProps) {
  const [stationName, setStationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Clear validation/submission errors when the user types
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [stationName, error]);

  // Validation function (checks format and duplicates)
  const validateStationName = async (name: string): Promise<{ isValid: boolean; message: string | null }> => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { isValid: false, message: 'Station name is required.' };
    }
    if (trimmedName.length < 2) {
      return { isValid: false, message: 'Station name must be at least 2 characters long.' };
    }
    if (trimmedName.length > 50) {
      return { isValid: false, message: 'Station name must be less than 50 characters long.' };
    }

    setIsValidating(true);
    setError(null); // Clear previous errors before validation

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      console.log(`Validating station name: "${trimmedName}" for Dept: ${departmentId}`);
      const { count, error: checkError } = await supabase
        .from('stations')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', departmentId)
        .eq('name', trimmedName)
        .abortSignal(controller.signal); // Pass the signal

      clearTimeout(timeoutId); // Clear the timeout if the query finishes

      if (checkError) {
        if (checkError.name === 'AbortError') {
          console.error('Validation timed out');
          return { isValid: false, message: 'Validation timed out. Please check your connection and try again.' };
        }
        console.error('Validation Error - Supabase check failed:', checkError);
        return { isValid: false, message: 'Error checking for existing station. Please try again.' };
      }

      if (count && count > 0) {
        console.log(`Validation Failed - Duplicate found for name: "${trimmedName}"`);
        return { isValid: false, message: 'A station with this name already exists in this department.' };
      }

      console.log(`Validation Success for name: "${trimmedName}"`);
      return { isValid: true, message: null };

    } catch (err: unknown) { // Catch any error, including potential abort
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      clearTimeout(timeoutId); // Ensure timeout is cleared on any error
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('Validation timed out (caught)');
        return { isValid: false, message: 'Validation timed out. Please check your connection and try again.' };
      }
      console.error('Validation Error - Exception:', err);
      return { isValid: false, message: errorMessage };
    } finally {
      setIsValidating(false);
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit triggered');

    // Prevent submission if already submitting or validating
    if (isSubmitting || isValidating) {
      console.log('handleSubmit skipped: already submitting/validating');
      return;
    }

    setIsSubmitting(true);
    setError(null); // Clear previous errors

    // Perform validation first
    const validationResult = await validateStationName(stationName);
    if (!validationResult.isValid) {
      console.log('handleSubmit failed: Validation error');
      setError(validationResult.message);
      setIsSubmitting(false); // Reset submitting state
      return;
    }

    const trimmedName = stationName.trim();
    console.log(`Attempting to insert station: "${trimmedName}" into Dept: ${departmentId}`);

    try {
      // Insert the new station
      const { data, error: insertError } = await supabase
        .from('stations')
        .insert([{ name: trimmedName, department_id: departmentId }])
        .select() // Select the newly inserted row to confirm
        .single(); // Expect exactly one row back

      if (insertError) {
        console.error('Insert Error - Supabase:', insertError);
        // Provide more specific feedback if possible (e.g., unique constraint)
        setError(`Failed to add station: ${insertError.message}. Please try again.`);
        setIsSubmitting(false); // Reset submitting state
        return; // Stop execution here
      }

      if (!data) {
        // This case should ideally not happen if insertError is null, but check just in case
        console.error('Insert Error - No data returned after insert');
        setError('Failed to add station: No confirmation received. Please try again.');
        setIsSubmitting(false); // Reset submitting state
        return; // Stop execution here
      }

      console.log('Insert Success:', data);
      onSuccess(trimmedName); // Notify parent component of success
      onClose(); // Close the modal after success

    } catch (err: unknown) {
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('Insert Error - Exception:', err);
      setError(`An unexpected error occurred: ${errorMessage}. Please try again.`);
      // Ensure isSubmitting is reset even if onSuccess/onClose aren't called
      setIsSubmitting(false);
    }
    // No finally block needed here for setIsSubmitting, as it's handled in all error paths and success path leads to unmount/close.
  };

  // Determine if the submit button should be disabled
  const isSubmitDisabled = isSubmitting || isValidating || !stationName.trim();

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={() => !isSubmitting && onClose()}>
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
                  Add New Station
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4">
                  <div>
                    <label
                      htmlFor="stationName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Station Name
                    </label>
                    <input
                      type="text"
                      id="stationName"
                      name="stationName"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter station name"
                      disabled={isSubmitting || isValidating}
                      autoFocus
                      maxLength={50}
                      required
                    />
                  </div>

                  {(error || isValidating) && (
                    <div className="mt-2 text-sm h-5">
                      {isValidating ? (
                        <span className="text-gray-500 flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-1" /> Validating...
                        </span>
                      ) : error ? (
                        <span className="text-red-600">{error}</span>
                      ) : null}
                    </div>
                  )}
                  {!error && !isValidating && <div className="mt-2 text-sm h-5"></div>}

                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                      disabled={isSubmitDisabled}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Add Station'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 