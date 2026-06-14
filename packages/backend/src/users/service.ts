import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserSummary {
  id: string;
  email?: string;
  createdAt: string;
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

  return { getUsers };
};

export type UserService = ReturnType<typeof createUserService>;
