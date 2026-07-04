import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

// Centralised route guard (#7). Wrap a protected route's component with this
// instead of repeating a redirect effect in every page.
export function RequireAuth({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const session = useAuth((s) => s.session);
  const loading = useAuth((s) => s.loading);
  const isAdmin = useAuth((s) => s.roles.includes('admin'));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        Učitavanje...
      </div>
    );
  }
  if (!session) return <Navigate to="/login" />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}
