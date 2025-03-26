<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePatchesStore, type PatchType, type PatchApplication } from '@/stores/patches'
import { getDaysHoursFromNow } from '@/utils/date'

const authStore = useAuthStore()
const patchesStore = usePatchesStore()

// Initialize on mount
onMounted(() => {
  authStore.init()
})

// Get time left until a patch expires
function getTimeLeft(appliedAt: string, durationHours: number) {
  const date = new Date(appliedAt)
  const { days, hours } = getDaysHoursFromNow(
    new Date(date.getTime() + durationHours * 60 * 60 * 1000)
  )
  
  if (days < 0 || hours < 0) {
    return 'Expired'
  }
  
  return `${days}d ${hours}h`
}

// Get class for time left
function getTimeLeftClass(appliedAt: string, durationHours: number) {
  const date = new Date(appliedAt)
  const { days, hours } = getDaysHoursFromNow(
    new Date(date.getTime() + durationHours * 60 * 60 * 1000)
  )
  
  if (days < 0 || hours < 0) {
    return 'text-red-600'
  }
  
  if (days < 1) {
    return 'text-orange-600'
  }
  
  return 'text-green-600'
}

// Format date
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${month}/${day}/${year} ${hours}:${minutes}`
}

// Calculate expiry date
function calculateExpiryDate(appliedAt: string, durationHours: number) {
  const date = new Date(appliedAt)
  const expiryTimestamp = date.getTime() + durationHours * 60 * 60 * 1000
  return formatDate(new Date(expiryTimestamp).toISOString())
}

interface ActivePatch {
  id: string;
  patchTypeId: string;
  appliedAt: string;
  location: string;
  notes?: string;
  patchName: string;
  isCustom: boolean;
  durationHours: number;
  imageUrl: string;
}

// Get active patches
const activePatches = computed<ActivePatch[]>(() => {
  return patchesStore.applications
    .map(app => {
      const patchType = patchesStore.getPatchType(app.patchTypeId)
      return {
        ...app,
        patchName: patchType?.name || 'Unknown',
        isCustom: patchType?.isCustom || false,
        durationHours: patchType?.durationHours || 0,
        imageUrl: patchesStore.getPatchImagePath(app.patchTypeId)
      }
    })
    .sort((a, b) => {
      // Sort by expiry date (soonest first)
      const aDate = new Date(a.appliedAt)
      const bDate = new Date(b.appliedAt)
      const aExpiry = aDate.getTime() + a.durationHours * 60 * 60 * 1000
      const bExpiry = bDate.getTime() + b.durationHours * 60 * 60 * 1000
      return aExpiry - bExpiry
    })
})

interface InventoryItem {
  id: string;
  name: string;
  isCustom: boolean;
  inventory: number;
  imageUrl: string;
  status: 'out' | 'low' | 'ok';
}

// Get inventory summary
const inventorySummary = computed(() => {
  return patchesStore.patchTypes
    .filter(pt => pt.enabled)
    .map(pt => {
      const inventoryItem = patchesStore.inventory.find(item => item.patchTypeId === pt.id)
      const count = inventoryItem?.count || 0
      let status: 'out' | 'low' | 'ok';
      
      if (count <= 0) {
        status = 'out';
      } else if (count < 3) {
        status = 'low';
      } else {
        status = 'ok';
      }
      
      return {
        id: pt.id,
        name: pt.name,
        isCustom: pt.isCustom || false,
        inventory: count,
        imageUrl: patchesStore.getPatchImagePath(pt.id),
        status
      }
    })
    .sort((a, b) => {
      // Sort by status (out, low, ok) and then by name
      if (a.status !== b.status) {
        if (a.status === 'out') return -1
        if (b.status === 'out') return 1
        if (a.status === 'low') return -1
        if (b.status === 'low') return 1
      }
      return a.name.localeCompare(b.name)
    })
})

// Check if we need to show inventory warnings
const hasLowInventory = computed(() => {
  return inventorySummary.value.some(item => item.status === 'out' || item.status === 'low')
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
    
    <main class="flex-1 w-full max-w-4xl mx-auto p-6">
      <h2 class="text-2xl mb-6 text-primary-700">Dashboard</h2>
      
      <div v-if="authStore.user" class="mb-6">
        <p class="text-lg">
          Welcome back, <span class="font-semibold">{{ authStore.user.username }}</span>!
        </p>
      </div>
      
      <!-- Active Patches -->
      <div class="pixel-card mb-6">
        <h3 class="text-xl mb-4 text-primary-700">Active Patches</h3>
        
        <div v-if="activePatches.length === 0" class="text-center py-6">
          <p class="text-gray-600">No active patches</p>
          <router-link to="/patches" class="pixel-btn inline-block mt-4 bg-primary-500 hover:bg-primary-600 text-white">
            Apply New Patch
          </router-link>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="patch in activePatches" 
            :key="patch.id"
            class="border border-gray-200 rounded-lg p-4 flex items-start"
          >
            <img 
              :src="patch.imageUrl" 
              :alt="patch.patchName" 
              class="w-16 h-16 mr-4"
            />
            <div class="flex-1">
              <h4 class="font-semibold text-lg">
                {{ patch.patchName }}
                <span v-if="patch.isCustom" class="text-xs text-purple-600 ml-1">(Custom)</span>
              </h4>
              <p class="text-sm text-gray-600">
                Applied: {{ formatDate(patch.appliedAt) }}
              </p>
              <p class="text-sm text-gray-600">
                Expires: {{ calculateExpiryDate(patch.appliedAt, patch.durationHours) }}
              </p>
              <p class="text-sm font-medium mt-1" :class="getTimeLeftClass(patch.appliedAt, patch.durationHours)">
                Time remaining: {{ getTimeLeft(patch.appliedAt, patch.durationHours) }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Inventory Status -->
      <div class="pixel-card mb-6">
        <h3 class="text-xl mb-4 text-primary-700">Inventory Status</h3>
        
        <div v-if="hasLowInventory" class="mb-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
          <p class="font-medium text-orange-800">
            <span class="inline-block align-middle mr-2">⚠️</span>
            You have items that are low or out of stock
          </p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div 
            v-for="item in inventorySummary" 
            :key="item.id"
            class="border border-gray-200 rounded-lg p-3 flex flex-col items-center text-center"
          >
            <img 
              :src="item.imageUrl" 
              :alt="item.name" 
              class="w-16 h-16 mb-2"
            />
            <h4 class="font-semibold">
              {{ item.name }}
              <span v-if="item.isCustom" class="text-xs text-purple-600 ml-1">(Custom)</span>
            </h4>
            <p 
              class="font-medium mt-1" 
              :class="{
                'text-red-600': item.status === 'out',
                'text-orange-600': item.status === 'low',
                'text-green-600': item.status === 'ok'
              }"
            >
              {{ item.inventory }} in stock
              <span v-if="item.status === 'out'" class="text-xs">(Out of stock!)</span>
              <span v-else-if="item.status === 'low'" class="text-xs">(Low!)</span>
            </p>
          </div>
        </div>
        
        <div class="mt-4 text-center">
          <router-link to="/patches" class="pixel-btn inline-block bg-primary-500 hover:bg-primary-600 text-white">
            Manage Inventory
          </router-link>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="pixel-card">
        <h3 class="text-xl mb-4 text-primary-700">Quick Actions</h3>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <router-link to="/patches" class="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <h4 class="font-semibold text-lg">Apply Patch</h4>
            <p class="text-sm text-gray-600">Record a new patch application</p>
          </router-link>
          
          <router-link to="/patches" class="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <h4 class="font-semibold text-lg">Add to Inventory</h4>
            <p class="text-sm text-gray-600">Add new patches to your inventory</p>
          </router-link>
          
          <router-link to="/settings" class="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <h4 class="font-semibold text-lg">Manage Patch Types</h4>
            <p class="text-sm text-gray-600">Edit or add custom patch types</p>
          </router-link>
          
          <router-link to="/settings" class="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <h4 class="font-semibold text-lg">Notification Settings</h4>
            <p class="text-sm text-gray-600">Configure reminder preferences</p>
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template> 