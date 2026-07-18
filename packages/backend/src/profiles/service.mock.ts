import type { ProfileService, UserProfile } from './service';

const mockProfile: UserProfile = {
  id: 'mock-user-id',
  fullName: 'Mock Korisnik',
  phone: null,
  photoUrl: null,
  vehicleType: 'car',
  isAvailable: false,
  thumbsUp: 3,
  thumbsDown: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const createProfileServiceMock = (): ProfileService => ({
  getProfile: async (userId) =>
    userId === 'mock-user-id' ? mockProfile : null,
  updateProfile: async (userId, patch) => {
    if (userId !== 'mock-user-id') {
      return null;
    }
    return {
      ...mockProfile,
      ...(patch.fullName !== undefined && { fullName: patch.fullName }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
      ...(patch.vehicleType !== undefined && {
        vehicleType: patch.vehicleType,
      }),
      ...(patch.photoUrl !== undefined && { photoUrl: patch.photoUrl }),
    };
  },
});
