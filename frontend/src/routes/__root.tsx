import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from 'sonner'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="min-h-screen bg-bg-base text-text-primary">
        <Outlet />
      </div>
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast:
              '!rounded-2xl !border !border-text-primary/10 !bg-bg-lightest !shadow-[0_30px_60px_-20px_rgba(23,21,18,0.35)]',
            title: '!text-text-primary !font-medium',
            description: '!text-text-secondary',
            success: '!border-sage/40',
            error: '!border-rust/40',
          },
        }}
      />
      <TanStackRouterDevtools />
    </>
  ),
})
