<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePatchesStore } from '@/stores/patches'
import { useAuthStore } from '@/stores/auth'
import type { PatchType } from '@/stores/patches'
import { ElMessage, ElMessageBox } from 'element-plus'

const authStore = useAuthStore()
const patchesStore = usePatchesStore()

// Form state for applying a new patch
const newPatch = ref({
  patchTypeId: '',
  location: '',
  notes: ''
})

// Form state for adding patches to inventory
const newInventory = ref({
  patchTypeId: '',
  count: 1
})

// Toggle for showing different sections
const activeSection = ref<'apply' | 'inventory' | 'history'>('apply')

// Initialize on mount
onMounted(() => {
  authStore.init()
  
  // Default to first patch type if available
  if (patchesStore.patchTypes.length > 0) {
    newPatch.value.patchTypeId = patchesStore.patchTypes[0].id
    newInventory.value.patchTypeId = patchesStore.patchTypes[0].id
  }
})

// Apply a new patch
const applyPatch = () => {
  try {
    if (!newPatch.value.patchTypeId) {
      ElMessage.warning('Please select a patch type')
      return
    }
    
    if (!newPatch.value.location) {
      ElMessage.warning('Please enter an application location')
      return
    }
    
    const result = patchesStore.applyPatch(
      newPatch.value.patchTypeId,
      newPatch.value.location,
      newPatch.value.notes
    )
    
    ElMessage.success('Patch applied successfully')
    
    // Reset form
    newPatch.value.location = ''
    newPatch.value.notes = ''
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('Failed to apply patch')
    }
    console.error('Error applying patch:', error)
  }
}

// Add patches to inventory
const addInventory = () => {
  try {
    if (!newInventory.value.patchTypeId) {
      ElMessage.warning('Please select a patch type')
      return
    }
    
    if (newInventory.value.count <= 0) {
      ElMessage.warning('Please enter a valid quantity')
      return
    }
    
    patchesStore.addToInventory(
      newInventory.value.patchTypeId,
      newInventory.value.count
    )
    
    ElMessage.success(`Added ${newInventory.value.count} patches to inventory`)
    
    // Reset form
    newInventory.value.count = 1
  } catch (error) {
    ElMessage.error('Failed to update inventory')
    console.error('Error updating inventory:', error)
  }
}

// Remove a patch application
const removePatch = async (applicationId: string) => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to remove this patch record?',
      'Confirm Removal',
      {
        confirmButtonText: 'Yes, Remove',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    patchesStore.removeApplication(applicationId)
    ElMessage.success('Patch record removed')
  } catch (error) {
    // User canceled the operation
    if (error !== 'cancel') {
      console.error('Error removing patch:', error)
    }
  }
}

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Sort applications by date (newest first)
const sortedApplications = computed(() => {
  return [...patchesStore.applications].sort((a, b) => {
    return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  })
})

// Get patch type info
const getPatchTypeName = (patchTypeId: string) => {
  const patchType = patchesStore.getPatchType(patchTypeId)
  return patchType?.name || 'Unknown'
}
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
      <h2 class="text-2xl mb-6 text-primary-700">Manage Patches</h2>
      
      <!-- Section Tabs -->
      <div class="flex border-b border-gray-300 mb-6">
        <button 
          @click="activeSection = 'apply'"
          class="px-4 py-2 mr-2"
          :class="activeSection === 'apply' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'"
        >
          Apply New Patch
        </button>
        <button 
          @click="activeSection = 'inventory'"
          class="px-4 py-2 mr-2"
          :class="activeSection === 'inventory' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'"
        >
          Manage Inventory
        </button>
        <button 
          @click="activeSection = 'history'"
          class="px-4 py-2"
          :class="activeSection === 'history' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'"
        >
          Application History
        </button>
      </div>
      
      <!-- Apply New Patch Section -->
      <div v-if="activeSection === 'apply'" class="pixel-card">
        <h3 class="text-xl mb-4 text-primary-700">Apply New Patch</h3>
        
        <form @submit.prevent="applyPatch" class="space-y-4">
          <div>
            <label for="patchType" class="block mb-1">Patch Type</label>
            <select 
              id="patchType"
              v-model="newPatch.patchTypeId"
              class="pixel-input w-full"
              required
            >
              <option v-for="type in patchesStore.patchTypes" :key="type.id" :value="type.id">
                {{ type.name }} ({{ patchesStore.inventory.find(i => i.patchTypeId === type.id)?.count || 0 }} in stock)
              </option>
            </select>
          </div>
          
          <div>
            <label for="location" class="block mb-1">Application Location</label>
            <input 
              id="location"
              v-model="newPatch.location"
              type="text" 
              class="pixel-input w-full" 
              placeholder="e.g., Left arm, lower back, etc."
              required
            />
          </div>
          
          <div>
            <label for="notes" class="block mb-1">Notes (Optional)</label>
            <textarea 
              id="notes"
              v-model="newPatch.notes"
              class="pixel-input w-full" 
              placeholder="Any additional information about this application"
              rows="3"
            ></textarea>
          </div>
          
          <div class="pt-2">
            <button 
              type="submit" 
              class="pixel-btn w-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              Apply Patch
            </button>
          </div>
        </form>
      </div>
      
      <!-- Inventory Management Section -->
      <div v-if="activeSection === 'inventory'">
        <div class="pixel-card mb-6">
          <h3 class="text-xl mb-4 text-primary-700">Add to Inventory</h3>
          
          <form @submit.prevent="addInventory" class="space-y-4">
            <div>
              <label for="inventoryPatchType" class="block mb-1">Patch Type</label>
              <select 
                id="inventoryPatchType"
                v-model="newInventory.patchTypeId"
                class="pixel-input w-full"
                required
              >
                <option v-for="type in patchesStore.patchTypes" :key="type.id" :value="type.id">
                  {{ type.name }}
                </option>
              </select>
            </div>
            
            <div>
              <label for="count" class="block mb-1">Quantity</label>
              <input 
                id="count"
                v-model.number="newInventory.count"
                type="number" 
                class="pixel-input w-full" 
                min="1"
                required
              />
            </div>
            
            <div class="pt-2">
              <button 
                type="submit" 
                class="pixel-btn w-full bg-secondary-500 hover:bg-secondary-600 text-white"
              >
                Add to Inventory
              </button>
            </div>
          </form>
        </div>
        
        <div class="pixel-card">
          <h3 class="text-xl mb-4 text-primary-700">Current Inventory</h3>
          
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b-2 border-primary-200">
                  <th class="text-left py-2">Patch Type</th>
                  <th class="text-right py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in patchesStore.inventory" :key="item.patchTypeId" class="border-b border-gray-200">
                  <td class="py-2">{{ getPatchTypeName(item.patchTypeId) }}</td>
                  <td class="py-2 text-right font-medium" :class="item.count <= 3 ? 'text-red-600' : ''">
                    {{ item.count }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Application History Section -->
      <div v-if="activeSection === 'history'" class="pixel-card">
        <h3 class="text-xl mb-4 text-primary-700">Application History</h3>
        
        <div v-if="patchesStore.applications.length === 0" class="text-center py-8">
          <p class="text-gray-500">No patch applications recorded yet.</p>
        </div>
        
        <div v-else class="space-y-4">
          <div 
            v-for="application in sortedApplications" 
            :key="application.id"
            class="border-b border-gray-200 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0"
          >
            <div class="flex justify-between">
              <div>
                <h4 class="font-semibold">{{ getPatchTypeName(application.patchTypeId) }}</h4>
                <p class="text-sm text-gray-600">
                  Applied: {{ formatDate(application.appliedAt) }}
                </p>
                <p class="text-sm text-gray-600">
                  Location: {{ application.location }}
                </p>
                <p v-if="application.notes" class="text-sm text-gray-600 mt-1">
                  Notes: {{ application.notes }}
                </p>
              </div>
              
              <button 
                @click="removePatch(application.id)" 
                class="text-red-500 hover:text-red-700"
                title="Remove this record"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 