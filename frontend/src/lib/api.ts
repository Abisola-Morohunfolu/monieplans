import axios from 'axios'
import { signOut } from './auth'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut()
      const currentPath = window.location.pathname
      window.location.href = `/login${currentPath !== '/login' ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`
    }
    return Promise.reject(error)
  },
)
