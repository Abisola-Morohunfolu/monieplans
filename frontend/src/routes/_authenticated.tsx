import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { fetchSession } from '../hooks/useSession'
import { queryClient } from '../lib/queryClient'
import { queryKeys } from '../lib/queryKeys'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const session = await queryClient.fetchQuery({
      queryKey: queryKeys.user.session,
      queryFn: fetchSession,
    })
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AppLayout,
})
