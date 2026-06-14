import { z } from 'zod';

// Shared enums / domain vocabulary used by both backend and mobile.

export const VehicleType = z.enum([
  'car',
  'van',
  'truck',
  'motorcycle',
  'suv_4x4',
]);
export type VehicleType = z.infer<typeof VehicleType>;

export const HelpType = z.enum([
  'flat_tire',
  'dead_battery',
  'out_of_fuel',
  'stuck', // snow/mud/ditch
  'mechanical',
  'other',
]);
export type HelpType = z.infer<typeof HelpType>;

export const RequestStatus = z.enum([
  'open',
  'accepted',
  'in_progress',
  'resolved',
  'cancelled',
]);
export type RequestStatus = z.infer<typeof RequestStatus>;

export const LatLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLng>;

// Request payload contracts (kept in one place; backend validates, mobile reuses)
export const CreateHelpRequest = z.object({
  type: HelpType,
  description: z.string().max(500).optional(),
  location: LatLng,
});
export type CreateHelpRequest = z.infer<typeof CreateHelpRequest>;
