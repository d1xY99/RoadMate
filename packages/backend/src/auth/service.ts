import type { SupabaseClient } from '@supabase/supabase-js';

export interface SignUpResult {
  success: boolean;
  verificationRequired: boolean;
  message: string;
  userId?: string;
}

export const createAuthService = (deps: { anonClient: SupabaseClient }) => {
  const { anonClient } = deps;

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

  return { signUp };
};

export type AuthService = ReturnType<typeof createAuthService>;
