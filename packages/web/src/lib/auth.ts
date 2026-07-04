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
  resendVerification: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

// Where Supabase sends users after they click the confirmation email link.
const emailRedirectTo = `${window.location.origin}/auth/confirm`;

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
    // Load roles before clearing `loading` so admin guards don't flicker-redirect.
    if (data.session) await get().loadRoles();
    set({ session: data.session, loading: false });
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
      options: { data: { full_name: fullName }, emailRedirectTo },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    return { error: null, needsConfirmation: data.session === null };
  },
  resendVerification: async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    });
    return error ? error.message : null;
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ roles: [] });
  },
}));
