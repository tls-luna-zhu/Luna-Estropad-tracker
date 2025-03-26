<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)

const handleRegister = async () => {
  if (!username.value || !email.value || !password.value) {
    ElMessage.warning('Please fill out all required fields')
    return
  }
  
  if (password.value !== confirmPassword.value) {
    ElMessage.error('Passwords do not match')
    return
  }
  
  if (password.value.length < 8) {
    ElMessage.warning('Password must be at least 8 characters long')
    return
  }
  
  isSubmitting.value = true
  
  try {
    await authStore.register(username.value, email.value, password.value)
    ElMessage.success('Registration successful!')
    router.push('/dashboard')
  } catch (error) {
    ElMessage.error('Registration failed. Please try again.')
    console.error('Registration error:', error)
  } finally {
    isSubmitting.value = false
  }
}

const navigateToLogin = () => {
  router.push('/login')
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
        <h2 class="text-2xl mb-6 text-center text-primary-700">Create an Account</h2>
        
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label for="username" class="block mb-1">Username</label>
            <input 
              id="username"
              v-model="username"
              type="text" 
              class="pixel-input w-full" 
              placeholder="YourUsername"
              required
            />
          </div>
          
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
              minlength="8"
            />
          </div>
          
          <div>
            <label for="confirmPassword" class="block mb-1">Confirm Password</label>
            <input 
              id="confirmPassword"
              v-model="confirmPassword"
              type="password" 
              class="pixel-input w-full" 
              placeholder="••••••••"
              required
            />
          </div>
          
          <div class="pt-2">
            <button 
              type="submit" 
              class="pixel-btn w-full bg-secondary-500 hover:bg-secondary-600 text-white"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Registering...' : 'Register' }}
            </button>
          </div>
        </form>
        
        <div class="mt-6 text-center">
          <p class="mb-2">Already have an account?</p>
          <button 
            @click="navigateToLogin"
            class="text-primary-600 hover:text-primary-800 underline"
          >
            Login here
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