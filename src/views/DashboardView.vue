<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePatchesStore } from '@/stores/patches'
import { useNotificationsStore } from '@/stores/notifications'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const patchesStore = usePatchesStore()
const notificationsStore = useNotificationsStore()

// Initialize stores
onMounted(() => {
  authStore.init()
  notificationsStore.init()
  
  // Request notification permissions if not already granted
  if (notificationsStore.notificationPermission !== 'granted' &&
      notificationsStore.preferences.enableBrowserNotifications) {
    notificationsStore.requestNotificationPermission()
  }
})

// Navigate to patches view
const navigateToPatches = () => {
  router.push('/patches')
}

// Format time until patch change is needed
const formatTimeRemaining = (timeRemaining: number) => {
  if (timeRemaining <= 0) {
    return 'Expired (change now)'
  }
  
  const hours = Math.floor(timeRemaining / (60 * 60 * 1000))
  const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} days, ${hours % 24} hours`
  } else if (hours > 0) {
    return `${hours} hours, ${minutes} minutes`
  } else {
    return `${minutes} minutes`
  }
}

// Format date in a readable format
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Sort active patches by urgency (expired first, then by remaining time)
const sortedActivePatches = computed(() => {
  return [...patchesStore.activePatches].sort((a, b) => {
    if (a.isExpired && !b.isExpired) return -1
    if (!a.isExpired && b.isExpired) return 1
    return a.timeRemaining - b.timeRemaining
  })
})

// Calculate total patches applied
const totalApplied = computed(() => {
  return patchesStore.applications.length
})

// Calculate total patches in inventory
const totalInventory = computed(() => {
  return patchesStore.inventory.reduce((total, item) => total + item.count, 0)
})

// Count patches by type
const patchesByType = computed(() => {
  const result: Record<string, number> = {}
  
  for (const app of patchesStore.applications) {
    const patchType = patchesStore.getPatchType(app.patchTypeId)
    if (patchType) {
      result[patchType.name] = (result[patchType.name] || 0) + 1
    }
  }
  
  return result
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="w-full bg-primary-100 p-4 flex justify-between items-center shadow-md">
      <h1 class="text-2xl text-primary-800 font-pixel">Luna's EstroPad Tracker</h1>
      <nav class="flex gap-4">
        <router-link to="/dashboard" class="text-primary-700 hover:text-primary-900">Dashboard</router-link>
        <router-link to="/patches" class="text-primary-700 hover:text-primary-900">Patches</router-link>
        <router-link to="/settings" class="text-primary-700 hover:text-primary-900">Settings</router-link>
      </nav>
    </header>
    
    <main class="flex-1 w-full max-w-6xl mx-auto p-6">
      <h2 class="text-2xl mb-6 text-primary-700">Dashboard</h2>
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="pixel-card bg-primary-50">
          <h3 class="text-lg mb-2 text-primary-600">Active Patches</h3>
          <p class="text-3xl font-bold">{{ sortedActivePatches.length }}</p>
        </div>
        
        <div class="pixel-card bg-primary-50">
          <h3 class="text-lg mb-2 text-primary-600">Total Applied</h3>
          <p class="text-3xl font-bold">{{ totalApplied }}</p>
        </div>
        
        <div class="pixel-card bg-primary-50">
          <h3 class="text-lg mb-2 text-primary-600">Inventory</h3>
          <p class="text-3xl font-bold">{{ totalInventory }}</p>
        </div>
      </div>
      
      <!-- Inventory Alerts -->
      <div v-if="patchesStore.lowInventoryAlerts.length > 0" class="mb-8">
        <h3 class="text-xl mb-4 text-primary-700">Inventory Alerts</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="alert in patchesStore.lowInventoryAlerts" 
            :key="alert.patchTypeId"
            class="pixel-card border-2"
            :class="alert.isOut ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'"
          >
            <h4 class="text-lg font-semibold">
              {{ alert.patchType?.name }}
            </h4>
            <p v-if="alert.isOut" class="text-red-600 font-bold">
              OUT OF STOCK! Please refill your prescription.
            </p>
            <p v-else class="text-yellow-700">
              Low stock: {{ alert.count }} patches remaining
            </p>
          </div>
        </div>
      </div>
      
      <!-- Active Patches -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl text-primary-700">Active Patches</h3>
          <button 
            @click="navigateToPatches" 
            class="pixel-btn bg-secondary-500 hover:bg-secondary-600 text-white text-sm"
          >
            Manage Patches
          </button>
        </div>
        
        <div v-if="sortedActivePatches.length === 0" class="pixel-card text-center py-8">
          <p class="text-gray-500">No active patches. Apply a new patch to get started!</p>
          <button 
            @click="navigateToPatches" 
            class="pixel-btn mt-4 bg-primary-500 hover:bg-primary-600 text-white"
          >
            Apply New Patch
          </button>
        </div>
        
        <div v-else class="space-y-4">
          <div 
            v-for="patch in sortedActivePatches" 
            :key="patch.id"
            class="pixel-card"
            :class="{'border-red-500': patch.isExpired}"
          >
            <div class="flex flex-col md:flex-row justify-between">
              <div>
                <h4 class="text-lg font-semibold">
                  {{ patch.patchType?.name }}
                </h4>
                <p class="text-sm text-gray-600">
                  Applied: {{ formatDate(patch.appliedAt) }}
                </p>
                <p class="text-sm text-gray-600">
                  Location: {{ patch.location }}
                </p>
                <p class="mt-2 font-semibold" :class="patch.isExpired ? 'text-red-600' : 'text-primary-600'">
                  {{ formatTimeRemaining(patch.timeRemaining) }}
                </p>
              </div>
              
              <div class="mt-4 md:mt-0">
                <button 
                  v-if="patch.isExpired"
                  @click="navigateToPatches" 
                  class="pixel-btn bg-red-500 hover:bg-red-600 text-white text-sm"
                >
                  Change Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 