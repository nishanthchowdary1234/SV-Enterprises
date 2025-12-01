import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    isAdmin: boolean;
    loading: boolean;
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, isAdmin: false });
    },
    initialize: async () => {
        set({ loading: true });

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        let isAdmin = false;
        if (session?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
            isAdmin = profile?.role === 'admin';
        }

        set({ session, user: session?.user ?? null, isAdmin, loading: false });

        // Listen for changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
            // console.log('Auth event:', _event, session?.user?.id);

            const currentUser = get().user;
            const currentIsAdmin = get().isAdmin;

            // If user hasn't changed, we don't need to re-fetch admin status
            // unless it's an initial session check or explicit sign in
            if (session?.user?.id === currentUser?.id && currentIsAdmin !== undefined) {
                // Ensure session is not null before accessing user, though the check above implies it
                set({ session, user: session?.user ?? null, loading: false });
                return;
            }

            let isAdmin = false;
            if (session?.user) {
                // Try to get role from metadata first (if you add it there later)
                // Otherwise fetch from profiles
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                isAdmin = profile?.role === 'admin';
            }
            set({ session, user: session?.user ?? null, isAdmin, loading: false });
        });
    },
}));
