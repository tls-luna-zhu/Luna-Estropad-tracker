<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateToLogin = () => {
  router.push('/login')
}

const navigateToRegister = () => {
  router.push('/register')
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center">
    <header class="w-full bg-primary-100 p-4 flex justify-center shadow-md">
      <h1 class="text-3xl text-primary-800 font-pixel">Luna's EstroPad Tracker</h1>
    </header>
    
    <main class="flex-1 w-full max-w-6xl mx-auto p-6 flex flex-col items-center justify-center">
      <div class="pixel-card max-w-2xl w-full mx-auto text-center">
        <div class="mb-6">
          <img src="/favicon.svg" alt="Luna's EstroPad Tracker" class="w-48 h-48 mx-auto mb-4">
          <h2 class="text-2xl mb-4 text-primary-700">Welcome to Luna's EstroPad Tracker!</h2>
          <p class="mb-4">
            A specialized app designed to help you track your estrogen patch applications, inventory, and receive timely reminders.
          </p>
        </div>
        
        <div class="flex flex-col sm:flex-row justify-center gap-4 mt-8">
          <button 
            @click="navigateToLogin"
            class="pixel-btn bg-primary-500 hover:bg-primary-600 text-white"
          >
            Login
          </button>
          <button 
            @click="navigateToRegister"
            class="pixel-btn bg-secondary-500 hover:bg-secondary-600 text-white"
          >
            Register
          </button>
        </div>
        
        <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="pixel-card">
            <h3 class="text-xl mb-2 text-primary-600">Track Your Patches</h3>
            <p>Easily record when and where you apply your patches.</p>
          </div>
          <div class="pixel-card">
            <h3 class="text-xl mb-2 text-primary-600">Smart Reminders</h3>
            <p>Get notified when it's time to change your patches.</p>
          </div>
          <div class="pixel-card">
            <h3 class="text-xl mb-2 text-primary-600">Inventory Management</h3>
            <p>Keep track of your patch supply and get alerted when you're running low.</p>
          </div>
        </div>
      </div>
    </main>
    
    <footer class="w-full bg-primary-100 p-4 text-center">
      <p class="text-sm text-primary-700">
        &copy; 2025 Luna's EstroPad Tracker - A supportive tool for MTF transgender individuals
      </p>
    </footer>
  </div>
</template> 