import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { GlobalRealtime } from '@/components/GlobalRealtime';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AuthConfirm } from '@/pages/AuthConfirm';
import { DirectChat } from '@/pages/DirectChat';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Friends } from '@/pages/Friends';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Messages } from '@/pages/Messages';
import { MyRequests } from '@/pages/MyRequests';
import { Profile } from '@/pages/Profile';
import { Register } from '@/pages/Register';
import { RequestDetail } from '@/pages/RequestDetail';
import { ResetPassword } from '@/pages/ResetPassword';

const rootRoute = createRootRoute({
  component: () => (
    <>
      <GlobalRealtime />
      <Outlet />
    </>
  ),
});

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

const requestDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/request/$id',
  component: () => (
    <RequireAuth>
      <RequestDetail />
    </RequireAuth>
  ),
});

const myRequestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/requests',
  component: () => (
    <RequireAuth>
      <MyRequests />
    </RequireAuth>
  ),
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  component: () => (
    <RequireAuth>
      <Friends />
    </RequireAuth>
  ),
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages',
  component: () => (
    <RequireAuth>
      <Messages />
    </RequireAuth>
  ),
});

const directChatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages/$userId',
  component: () => (
    <RequireAuth>
      <DirectChat />
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
  requestDetailRoute,
  myRequestsRoute,
  friendsRoute,
  messagesRoute,
  directChatRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
