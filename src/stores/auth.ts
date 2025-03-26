import { defineStore } from 'pinia'
import { ref } from 'vue'

interface User {
  id: string
  username: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Initialize user from localStorage
  function init() {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      user.value = JSON.parse(storedUser)
    }
  }

  // Login user
  async function login(email: string, password: string) {
    isLoading.value = true
    error.value = null
    
    try {
      // This would be an API call in a real application
      // For demo purposes, we'll simulate a successful login
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock user data
      const mockUser: User = {
        id: '1',
        username: email.split('@')[0],
        email
      }
      
      user.value = mockUser
      localStorage.setItem('user', JSON.stringify(mockUser))
    } catch (err) {
      error.value = 'Invalid email or password'
      console.error('Login error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Register user
  async function register(username: string, email: string, password: string) {
    isLoading.value = true
    error.value = null
    
    try {
      // This would be an API call in a real application
      // For demo purposes, we'll simulate a successful registration
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock user data
      const mockUser: User = {
        id: '1',
        username,
        email
      }
      
      user.value = mockUser
      localStorage.setItem('user', JSON.stringify(mockUser))
    } catch (err) {
      error.value = 'Registration failed'
      console.error('Registration error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Logout user
  function logout() {
    user.value = null
    localStorage.removeItem('user')
  }

  return {
    user,
    isLoading,
    error,
    init,
    login,
    register,
    logout
  }
}) 