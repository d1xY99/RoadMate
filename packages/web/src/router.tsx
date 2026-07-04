import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AuthConfirm } from '@/pages/AuthConfirm';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Profile } from '@/pages/Profile';
import { Register } from '@/pages/Register';
import { ResetPassword } from '@/pages/ResetPassword';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: Register,
});

const authConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/confirm',
  component: AuthConfirm,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPassword,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPassword,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin-dashboard',
  component: () => (
    <RequireAuth requireAdmin>
      <AdminDashboard />
    </RequireAuth>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  authConfirmRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  adminRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
