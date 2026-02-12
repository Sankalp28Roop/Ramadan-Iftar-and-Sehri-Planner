import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Mock object to prevent runtime crashes when keys are missing
const mockSupabase = {
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithPassword: async () => ({ data: {}, error: new Error('Supabase not configured') }),
        signUp: async () => ({ data: {}, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: null }),
    },
    from: () => ({
        select: () => ({
            eq: () => ({
                single: async () => ({ data: null, error: null }),
                order: () => ({ limit: async () => ({ data: null, error: null }) })
            })
        }),
        upsert: async () => ({ error: new Error('Supabase not configured') }),
        insert: async () => ({ error: new Error('Supabase not configured') }),
        delete: () => ({ eq: async () => ({ error: new Error('Supabase not configured') }) }),
    }),
};

if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
        console.error('Supabase credentials missing. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.');
    }
} else if (!supabaseAnonKey.startsWith('eyJ')) {
    if (typeof window !== 'undefined') {
        console.warn('Supabase Anon Key format looks invalid. It should usually start with "eyJ" (JWT). Yours starts with "' + supabaseAnonKey.substring(0, 15) + '...". This might be a Clerk/BuildShip key instead.');
    }
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (mockSupabase as any);
