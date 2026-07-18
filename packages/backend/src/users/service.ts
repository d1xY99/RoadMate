import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserSummary {
  id: string;
  email?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export const createUserService = (deps: { serviceClient: SupabaseClient }) => {
  const { serviceClient } = deps;

  // Admin listing requires the service-role client
  const getUsers = async (): Promise<UserSummary[]> => {
    const { data, error } = await serviceClient.auth.admin.listUsers();
    if (error) {
      throw new Error(error.message);
    }
    return data.users.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
    }));
  };

  // Resolve (and validate) the user behind a Bearer access token. Returns null
  // when the token is missing, expired or otherwise invalid.
  const getUserFromToken = async (
    accessToken: string,
  ): Promise<AuthUser | null> => {
    const { data, error } = await serviceClient.auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }
    return { id: data.user.id, email: data.user.email };
  };

  return { getUsers, getUserFromToken };
};

export type UserService = ReturnType<typeof createUserService>;
