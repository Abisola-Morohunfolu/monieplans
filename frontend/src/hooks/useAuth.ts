import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  signIn,
  signUp,
  signOut,
  sendVerificationEmail,
  verifyEmail,
} from '../lib/auth';
import { queryKeys } from '../lib/queryKeys';
import { useSessionQuery } from './useSession';

export function useAuth() {
  const session = useSessionQuery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const refreshSession = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.user.session });

  return {
    session: session.data,
    user: session.data?.user,
    isLoading: session.isPending,
    isAuthenticated: !!session.data?.user,
    refreshSession,
    signIn,
    signUp,
    signOut: async () => {
      const result = await signOut();
      if (result.error) {
        throw new Error(
          result.error.message || 'Could not sign out. Try again.',
        );
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(queryKeys.user.session, null);
      toast.success('Signed out.');
      await navigate({ to: '/login', replace: true });
    },
    sendVerificationEmail,
    verifyEmail,
  };
}
