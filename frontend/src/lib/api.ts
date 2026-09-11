import axios from 'axios'
import { signOut } from './auth'
import { queryClient } from './queryClient'
import { queryKeys } from './queryKeys'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut()
      queryClient.invalidateQueries({ queryKey: queryKeys.user.session })
      const currentPath = window.location.pathname
      window.location.href = `/login${currentPath !== '/login' ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`
    }
    return Promise.reject(error)
  },
)
