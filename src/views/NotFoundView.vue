<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center">
    <header class="w-full bg-primary-100 p-4 flex justify-center shadow-md">
      <h1 class="text-3xl text-primary-800 font-pixel">Luna's EstroPad Tracker</h1>
    </header>
    
    <main class="flex-1 w-full max-w-md mx-auto p-6 flex flex-col items-center justify-center">
      <div class="pixel-card w-full text-center">
        <h2 class="text-3xl mb-4 text-primary-700">404</h2>
        <p class="text-xl mb-6">Page Not Found</p>
        <p class="mb-8 text-gray-600">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div class="flex justify-center gap-4">
          <button 
            @click="goBack" 
            class="pixel-btn bg-secondary-500 hover:bg-secondary-600 text-white"
          >
            Go Back
          </button>
          
          <button 
            @click="goHome" 
            class="pixel-btn bg-primary-500 hover:bg-primary-600 text-white"
          >
            Go Home
          </button>
        </div>
      </div>
    </main>
  </div>
</template> 