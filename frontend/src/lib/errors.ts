import { isAxiosError } from 'axios'

export function isUnauthorized(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    if (data?.error) return data.error
    if (data?.message) return data.message
    return error.message || 'Something went wrong'
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong'
}
