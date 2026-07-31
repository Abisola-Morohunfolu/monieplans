import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { authClient } from '../lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    // In a real scenario you'd verify if the user is authenticated. 
    // We'll leave it as a comment for now or check if not authenticated:
    // const { data: session } = await authClient.getSession()
    // if (!session) {
    //   throw redirect({ to: '/login' })
    // }
  },
  component: AppLayout,
})
