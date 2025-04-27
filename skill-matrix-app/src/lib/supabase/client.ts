'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/lib/types/supabase'; // Ensure Database type is correctly imported

// It's often better to create the client instance within a context or hook
// to avoid creating it multiple times, but for simplicity here, we create it once.

// Ensure these environment variables are correctly defined in your .env.local
// and prefixed with NEXT_PUBLIC_ for browser access.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        },
        cookieOptions: {
            name: 'sb-session',
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        }
    }
);

// // Original code (for reference/removal)
// import { createClient } from '@supabase/supabase-js';
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: true,
//   },
//   global: {
//     fetch: (...args) => {
//       console.log('Supabase fetch:', args[0]);
//       return fetch(...args);
//     }
//   }
// }); 