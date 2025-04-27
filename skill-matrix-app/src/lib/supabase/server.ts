import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'; // Import the specific type
import { Database } from '@/lib/types/supabase';

// Function to create a server client, requiring the cookie store
export function createSupabaseServerClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get() {
          // Always use 'sb-session' as the cookie name
          return cookieStore.get('sb-session')?.value;
        },
        set(_name: string, value: string, options: CookieOptions) {
          // In Server Components and Route Handlers, set is generally not needed
          // as the session is managed by middleware. Attempting might log error.
          try {
             cookieStore.set({ name: 'sb-session', value, ...options });
          } catch {
             console.warn(`Supabase server client: Failed to set cookie 'sb-session' in server context. This might be expected if using middleware.`);
             // Handle or ignore error
          }
        },
        remove(_name: string, options: CookieOptions) {
          // Similar to set, remove might not be needed directly in SC/RH with middleware
          try {
             cookieStore.set({ name: 'sb-session', value: '', ...options }); // Standard way to remove via set
          } catch {
             console.warn(`Supabase server client: Failed to remove cookie 'sb-session' in server context. This might be expected if using middleware.`);
             // Handle or ignore error
          }
        },
      },
    }
  );
}

// We will call cookies() from 'next/headers' in the actual Server Component / Server Action
// and pass the result to this function.
// No further code needed in this file for the basic server client setup. 