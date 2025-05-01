import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../utils/supabase'

interface User {
  id: string
  username: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Initialize user from Supabase session
  async function init() {
    const { data } = await supabase.auth.getSession()
    
    if (data.session) {
      const { user: supabaseUser } = data.session
      
      if (supabaseUser) {
        user.value = {
          id: supabaseUser.id,
          username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || '',
          email: supabaseUser.email || ''
        }
      }
    }
  }

  // Login user with Supabase
  async function login(email: string, password: string) {
    isLoading.value = true
    error.value = null
    
    try {
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (supabaseError) throw supabaseError
      
      if (data.user) {
        user.value = {
          id: data.user.id,
          username: data.user.user_metadata?.username || email.split('@')[0],
          email: data.user.email || email
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Invalid email or password'
      console.error('Login error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Register user with Supabase
  async function register(username: string, email: string, password: string) {
    isLoading.value = true
    error.value = null
    
    try {
      const { data, error: supabaseError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      })
      
      if (supabaseError) throw supabaseError
      
      if (data.user) {
        user.value = {
          id: data.user.id,
          username,
          email: data.user.email || email
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Registration failed'
      console.error('Registration error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Logout user from Supabase
  async function logout() {
    try {
      await supabase.auth.signOut()
      user.value = null
    } catch (err) {
      console.error('Logout error:', err)
    }
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