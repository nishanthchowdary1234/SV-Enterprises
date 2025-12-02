import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
    full_name: string | null;
    role: string;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
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
    profile: null,
    isAdmin: false,
    loading: true,
    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, profile: null, isAdmin: false });
    },
    initialize: async () => {
        set({ loading: true });

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        let profile: Profile | null = null;
        let isAdmin = false;

        if (session?.user) {
            const { data } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', session.user.id)
                .single();

            if (data) {
                profile = data;
                isAdmin = data.role === 'admin';
            }
        }

        set({ session, user: session?.user ?? null, profile, isAdmin, loading: false });

        // Listen for changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = get().user;

            if (session?.user?.id === currentUser?.id && get().profile) {
                set({ session, user: session?.user ?? null, loading: false });
                return;
            }

            let profile: Profile | null = null;
            let isAdmin = false;

            if (session?.user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('id', session.user.id)
                    .single();

                if (data) {
                    profile = data;
                    isAdmin = data.role === 'admin';
                }
            }
            set({ session, user: session?.user ?? null, profile, isAdmin, loading: false });
        });
    },
}));
