import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { router } from '@/router';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@/index.css';

const queryClient = new QueryClient();

useTheme.getState().init();
useAuth.getState().init();

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
