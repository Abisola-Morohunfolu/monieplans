import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="min-h-screen bg-bg-base dark:bg-dark-1 text-text-primary">
        <Outlet />
      </div>
      <TanStackRouterDevtools />
    </>
  ),
})
