import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { ThemeProvider } from './shared/providers/ThemeProvider.tsx'
import { AuthProvider } from './core/auth/auth-context.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
)
