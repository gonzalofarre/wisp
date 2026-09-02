import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { SessionProvider } from '@/hooks/useSession'
import { ErrorBoundary } from '@/shared/ErrorBoundary/ErrorBoundary'

const queryClient = new QueryClient()

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
