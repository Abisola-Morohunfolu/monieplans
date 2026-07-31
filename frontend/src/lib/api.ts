import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true, // For better-auth session cookies
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors, e.g., 401 Unauthorized
    if (error.response?.status === 401) {
      // Potentially redirect to login
      console.warn('Unauthorized access. Redirecting to login.')
    }
    return Promise.reject(error)
  }
)
