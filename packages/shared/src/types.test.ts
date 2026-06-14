import { describe, expect, it } from 'bun:test';
import { CreateHelpRequest, HelpType, VehicleType } from './types';

describe('shared contracts', () => {
  it('accepts a valid help request', () => {
    const parsed = CreateHelpRequest.parse({
      type: 'flat_tire',
      location: { lat: 45.81, lng: 15.98 },
    });
    expect(parsed.type).toBe('flat_tire');
  });

  it('rejects an out-of-range latitude', () => {
    const res = CreateHelpRequest.safeParse({
      type: 'flat_tire',
      location: { lat: 999, lng: 15.98 },
    });
    expect(res.success).toBe(false);
  });

  it('rejects an unknown help type', () => {
    const res = HelpType.safeParse('teleport');
    expect(res.success).toBe(false);
  });

  it('includes truck as a vehicle type', () => {
    expect(VehicleType.options).toContain('truck');
  });
});
