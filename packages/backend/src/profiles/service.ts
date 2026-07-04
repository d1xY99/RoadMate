import type { SupabaseClient } from '@supabase/supabase-js';

export type VehicleType = 'car' | 'van' | 'truck' | 'motorcycle' | 'suv_4x4';

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string | null;
  photoUrl: string | null;
  vehicleType: VehicleType | null;
  isAvailable: boolean;
  thumbsUp: number;
  thumbsDown: number;
  createdAt: string;
}

// Fields a user may change on their own profile (see #38). Availability
// (`is_available`) is intentionally excluded — that's the helper toggle (#11).
export interface ProfileUpdate {
  fullName?: string;
  phone?: string | null;
  vehicleType?: VehicleType | null;
  photoUrl?: string | null;
}

// PostgREST error code for `.single()` when zero rows match.
const NO_ROWS = 'PGRST116';

const PROFILE_COLUMNS =
  'id, full_name, phone, photo_url, vehicle_type, is_available, thumbs_up, thumbs_down, created_at';

type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  photo_url: string | null;
  vehicle_type: VehicleType | null;
  is_available: boolean;
  thumbs_up: number;
  thumbs_down: number;
  created_at: string;
};

const mapProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  fullName: row.full_name,
  phone: row.phone,
  photoUrl: row.photo_url,
  vehicleType: row.vehicle_type,
  isAvailable: row.is_available,
  thumbsUp: row.thumbs_up,
  thumbsDown: row.thumbs_down,
  createdAt: row.created_at,
});

// Owns storage access to the `profiles` table (#42). Reads/updates a single
// user's profile by id; callers resolve the id from the access token first.
export const createProfileService = (deps: {
  serviceClient: SupabaseClient;
}) => {
  const { serviceClient } = deps;

  // Read a user's own profile. Null when no profile row exists yet.
  const getProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await serviceClient
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single();
    if (error) {
      if (error.code === NO_ROWS) {
        return null;
      }
      throw new Error(error.message);
    }
    return mapProfile(data as ProfileRow);
  };

  // Patch a user's own profile with only the provided fields. Null when the
  // profile row does not exist.
  const updateProfile = async (
    userId: string,
    patch: ProfileUpdate,
  ): Promise<UserProfile | null> => {
    const row: Record<string, unknown> = {};
    if (patch.fullName !== undefined) row.full_name = patch.fullName;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.vehicleType !== undefined) row.vehicle_type = patch.vehicleType;
    if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;

    // Nothing to change — return the current profile as-is.
    if (Object.keys(row).length === 0) {
      return getProfile(userId);
    }

    const { data, error } = await serviceClient
      .from('profiles')
      .update(row)
      .eq('id', userId)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) {
      if (error.code === NO_ROWS) {
        return null;
      }
      throw new Error(error.message);
    }
    return mapProfile(data as ProfileRow);
  };

  return { getProfile, updateProfile };
};

export type ProfileService = ReturnType<typeof createProfileService>;
