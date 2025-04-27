'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const { error } = await supabase
          .from('departments')
          .select('*')
          .limit(1);

        if (error) {
          setError(error.message);
          setConnectionStatus('Connection failed');
        } else {
          setConnectionStatus('Connection successful!');
        }
      } catch {
        setError('Failed to connect to Supabase');
        setConnectionStatus('Connection failed');
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Supabase Connection Test
          </h2>
        </div>
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm p-4 bg-gray-50">
            <p className="text-center text-lg font-medium text-gray-900">
              Status: {connectionStatus}
            </p>
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 