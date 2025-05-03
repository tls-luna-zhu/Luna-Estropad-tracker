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

  /**
   * Initializes the authentication state by retrieving the current user session from Supabase.
   *
   * If a valid session and user are found, updates the user state with the user's id, username, and email.
   */
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

  /**
   * Authenticates a user using Supabase with the provided email and password.
   *
   * On successful authentication, updates the user state with the user's id, username, and email. If authentication fails, sets an error message.
   *
   * @param email - The user's email address.
   * @param password - The user's password.
   */
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

  /**
   * Registers a new user with Supabase using the provided username, email, and password.
   *
   * On successful registration, updates the authentication state with the new user's information.
   *
   * @param username - The desired username for the new user.
   * @param email - The email address for the new user.
   * @param password - The password for the new user.
   */
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

  /**
   * Signs out the current user from Supabase and clears the user state.
   *
   * @remark
   * If an error occurs during sign-out, it is logged but not surfaced to the caller.
   */
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