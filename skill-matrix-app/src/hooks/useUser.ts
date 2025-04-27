import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

interface UseUserReturn {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export const useUser = (): UseUserReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkUserRole = async (userId: string) => {
    try {
      console.log('Checking if user is admin:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return false;
      }

      console.log('User role data:', data);
      return data?.role === 'admin';
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  };

  useEffect(() => {
    // Check current auth status
    const checkUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user:', userError);
          setUser(null);
          setIsAdmin(false);
          return;
        }

        console.log('Auth user:', user);
        setUser(user);
        
        if (user) {
          const isUserAdmin = await checkUserRole(user.id);
          console.log('Is user admin:', isUserAdmin);
          setIsAdmin(isUserAdmin);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setUser(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        console.log('Auth state changed:', _event, session?.user?.id);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const isUserAdmin = await checkUserRole(session.user.id);
          setIsAdmin(isUserAdmin);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, isLoading };
}; 