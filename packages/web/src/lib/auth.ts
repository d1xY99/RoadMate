import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  roles: string[];
  loading: boolean;
  isAdmin: () => boolean;
  init: () => Promise<void>;
  loadRoles: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  roles: [],
  loading: true,
  isAdmin: () => get().roles.includes('admin'),
  loadRoles: async () => {
    const { data } = await supabase.rpc('current_user_roles');
    set({ roles: (data as string[] | null) ?? [] });
  },
  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, loading: false });
    if (data.session) await get().loadRoles();
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) get().loadRoles();
      else set({ roles: [] });
    });
  },
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return error.message;
    await get().loadRoles();
    return null;
  },
  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    return { error: null, needsConfirmation: data.session === null };
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ roles: [] });
  },
}));
