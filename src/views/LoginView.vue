<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) {
    ElMessage.warning('Please enter both email and password')
    return
  }
  
  isSubmitting.value = true
  
  try {
    await authStore.login(email.value, password.value)
    ElMessage.success('Login successful!')
    router.push('/dashboard')
  } catch (error) {
    ElMessage.error('Login failed. Please check your credentials.')
    console.error('Login error:', error)
  } finally {
    isSubmitting.value = false
  }
}

const navigateToRegister = () => {
  router.push('/register')
}

const navigateToHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center">
    <header class="w-full bg-primary-100 p-4 flex justify-center shadow-md">
      <h1 class="text-3xl text-primary-800 font-pixel">Luna's EstroPad Tracker</h1>
    </header>
    
    <main class="flex-1 w-full max-w-md mx-auto p-6 flex flex-col items-center justify-center">
      <div class="pixel-card w-full">
        <h2 class="text-2xl mb-6 text-center text-primary-700">Login</h2>
        
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="email" class="block mb-1">Email</label>
            <input 
              id="email"
              v-model="email"
              type="email" 
              class="pixel-input w-full" 
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label for="password" class="block mb-1">Password</label>
            <input 
              id="password"
              v-model="password"
              type="password" 
              class="pixel-input w-full" 
              placeholder="••••••••"
              required
            />
          </div>
          
          <div class="pt-2">
            <button 
              type="submit" 
              class="pixel-btn w-full"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Logging in...' : 'Login' }}
            </button>
          </div>
        </form>
        
        <div class="mt-6 text-center">
          <p class="mb-2">Don't have an account?</p>
          <button 
            @click="navigateToRegister"
            class="text-primary-600 hover:text-primary-800 underline"
          >
            Register here
          </button>
        </div>
        
        <div class="mt-4 text-center">
          <button 
            @click="navigateToHome"
            class="text-gray-600 hover:text-gray-800 text-sm"
          >
            &larr; Back to home
          </button>
        </div>
      </div>
    </main>
  </div>
</template> 