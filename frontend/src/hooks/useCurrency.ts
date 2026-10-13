import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
interface Preferences {
  preferredCurrency: string;
  timezone: string;
}
function usePreferences() {
  return useQuery<Preferences>({
    queryKey: queryKeys.user.me,
    queryFn: async () => (await api.get('/api/users/me')).data,
    staleTime: Infinity,
  });
}
export function usePreferredCurrency() {
  return usePreferences().data?.preferredCurrency ?? 'NGN';
}
export function usePreferredTimezone() {
  return usePreferences().data?.timezone ?? 'Africa/Lagos';
}
