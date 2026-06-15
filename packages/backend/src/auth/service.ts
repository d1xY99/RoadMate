import type { SupabaseClient } from '@supabase/supabase-js';

export interface SignUpResult {
  success: boolean;
  verificationRequired: boolean;
  message: string;
  userId?: string;
}

export type SignInResult =
  | {
      success: true;
      message: string;
      accessToken: string;
      refreshToken: string;
      expiresAt?: number;
      user: { id: string; email?: string };
    }
  | { success: false; message: string };

export interface SignOutResult {
  success: boolean;
  message: string;
}

export const createAuthService = (deps: {
  anonClient: SupabaseClient;
  serviceClient: SupabaseClient;
}) => {
  const { anonClient, serviceClient } = deps;

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
  ): Promise<SignUpResult> => {
    const { data, error } = await anonClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? '' } },
    });

    if (error) {
      return {
        success: false,
        verificationRequired: false,
        message: error.message,
      };
    }

    const verificationRequired = data.session === null;
    return {
      success: true,
      verificationRequired,
      message: verificationRequired
        ? 'Account created. Check your email to confirm your address.'
        : 'Account created.',
      userId: data.user?.id,
    };
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<SignInResult> => {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return {
        success: false,
        message: error?.message ?? 'Invalid email or password.',
      };
    }

    return {
      success: true,
      message: 'Signed in.',
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: { id: data.user.id, email: data.user.email },
    };
  };

  const signOut = async (accessToken: string): Promise<SignOutResult> => {
    const { error } = await serviceClient.auth.admin.signOut(accessToken);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Signed out.' };
  };

  return { signUp, signIn, signOut };
};

export type AuthService = ReturnType<typeof createAuthService>;
