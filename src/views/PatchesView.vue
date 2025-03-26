<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePatchesStore } from '@/stores/patches'
import { useAuthStore } from '@/stores/auth'
import type { PatchType } from '@/stores/patches'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDaysHoursFromNow } from '@/utils/date'

const authStore = useAuthStore()
const patchesStore = usePatchesStore()

// Form state for applying a new patch
const newPatch = ref({
  patchTypeId: '',
  location: '',
  notes: '',
  count: 1
})

// Form state for adding patches to inventory
const newInventory = ref({
  patchTypeId: '',
  count: 1
})

// Toggle for showing different sections
const activeSection = ref<'apply' | 'inventory' | 'history'>('apply')

// Count to add to inventory
const addCount = ref<Record<string, number>>({})

// Date for applying patch
const patchDate = ref(new Date())

// Selected patch type for applying
const selectedPatchType = ref('')

// Initialize on mount
onMounted(() => {
  authStore.init()
  
  // Default to first patch type if available
  if (patchesStore.patchTypes.length > 0) {
    newPatch.value.patchTypeId = patchesStore.patchTypes[0].id
    newInventory.value.patchTypeId = patchesStore.patchTypes[0].id
  }

  // Initialize add counts to 1 for each patch type
  patchesStore.patchTypes.forEach(patchType => {
    addCount.value[patchType.id] = 1
  })
})

// Apply patch
const applyPatch = () => {
  // Validate patch type is selected
  if (!selectedPatchType.value) {
    ElMessage.warning('Please select a patch type')
    return
  }
  
  // Get the patch type
  const patchType = patchesStore.getPatchType(selectedPatchType.value)
  if (!patchType) {
    ElMessage.error('Invalid patch type')
    return
  }
  
  try {
    // Apply the patch - note the location field is required in the store
    const result = patchesStore.applyPatch(
      selectedPatchType.value,
      'Body', // Default location
      '' // No notes
    )
    
    // Show a success message
    ElMessage.success(`Applied ${patchType.name} patch successfully`)
    
    // Reset the selected patch type
    selectedPatchType.value = ''
  } catch (error) {
    if (error instanceof Error) {
      // Show an error message
      ElMessage.error(error.message)
    } else {
      ElMessage.error('Failed to apply patch')
    }
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

// Remove patches from inventory
const removeFromInventory = async (patchTypeId: string, count: number, allPatches = false) => {
  try {
    // If removing all patches or multiple patches, ask for confirmation
    if (allPatches || count > 1) {
      const confirmMessage = allPatches 
        ? 'Are you sure you want to remove all patches of this type from inventory?' 
        : `Are you sure you want to remove ${count} patches from inventory?`
        
      await ElMessageBox.confirm(
        confirmMessage,
        'Confirm Removal',
        {
          confirmButtonText: 'Yes, Remove',
          cancelButtonText: 'Cancel',
          type: 'warning'
        }
      )
    }
    
    // Get actual count to remove if removing all patches
    if (allPatches) {
      const inventoryItem = patchesStore.inventory.find(item => item.patchTypeId === patchTypeId)
      if (inventoryItem) {
        count = inventoryItem.count
      }
    }
    
    patchesStore.removeFromInventory(patchTypeId, count)
    
    const message = count === 1 
      ? 'Removed 1 patch from inventory' 
      : `Removed ${count} patches from inventory`
      
    ElMessage.success(message)
  } catch (error) {
    // User canceled the operation
    if (error !== 'cancel') {
      ElMessage.error('Failed to update inventory')
      console.error('Error updating inventory:', error)
    }
  }
}

// Unapply a patch - remove application and return to inventory
const unapplyPatch = async (applicationId: string) => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to unapply this patch? This will remove the application record and return the patch to inventory.',
      'Confirm Unapply',
      {
        confirmButtonText: 'Yes, Unapply',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    const patchTypeId = patchesStore.unapplyPatch(applicationId)
    const patchType = patchesStore.getPatchType(patchTypeId)
    
    ElMessage.success(`Patch unapplied and returned to inventory (${patchType?.name || 'Unknown'})`)
  } catch (error) {
    // User canceled the operation
    if (error !== 'cancel') {
      if (error instanceof Error) {
        ElMessage.error(error.message)
      } else {
        ElMessage.error('Failed to unapply patch')
      }
      console.error('Error unapplying patch:', error)
    }
  }
}

// Remove a patch application
const removePatch = async (applicationId: string) => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to remove this patch record? This will only delete the record and NOT return the patch to inventory.',
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

// Format the date for applying patch
const formattedDate = computed(() => {
  const date = patchDate.value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})

// Add to inventory
const addToInventory = (patchTypeId: string) => {
  // Get the count for this patch type (default to 1)
  const count = addCount.value[patchTypeId] || 1
  
  // Validate the count
  if (count <= 0) {
    ElMessage.error('Count must be greater than 0')
    return
  }
  
  // Add to inventory
  patchesStore.addToInventory(patchTypeId, count)
  
  // Reset the add count to 1
  addCount.value[patchTypeId] = 1
  
  // Show a success message
  const patchType = patchesStore.getPatchType(patchTypeId)
  if (patchType) {
    ElMessage.success(`Added ${count} ${patchType.name} ${count === 1 ? 'patch' : 'patches'} to inventory`)
  }
}

// Format the expiry date
const formatAppliedAt = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// Calculate expiry date based on applied timestamp and duration
const calculateExpiryDate = (appliedAt: number, durationHours: number) => {
  const expiryDate = new Date(appliedAt + durationHours * 60 * 60 * 1000)
  return formatAppliedAt(expiryDate.getTime())
}

// Get time left until expiry
const getTimeLeft = (appliedAt: number, durationHours: number) => {
  const { days, hours } = getDaysHoursFromNow(new Date(appliedAt + durationHours * 60 * 60 * 1000))
  
  if (days < 0 || hours < 0) {
    return 'Expired'
  }
  
  return `${days} days, ${hours} hours`
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
              v-model="selectedPatchType"
              class="pixel-input w-full"
              required
            >
              <option v-for="type in patchesStore.enabledPatchTypes" :key="type.id" :value="type.id">
                {{ type.name }} ({{ patchesStore.inventory.find(i => i.patchTypeId === type.id)?.count || 0 }} in stock)
              </option>
            </select>
            <p v-if="patchesStore.enabledPatchTypes.length < patchesStore.patchTypes.length" class="text-sm text-gray-600 mt-1">
              Some patch types are disabled. You can enable them in Settings.
            </p>
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
            <label for="patchCount" class="block mb-1">Quantity</label>
            <input 
              id="patchCount"
              v-model.number="newPatch.count"
              type="number" 
              class="pixel-input w-full" 
              min="1"
              required
            />
            <p class="text-sm text-gray-600 mt-1">
              Number of patches to apply at once
            </p>
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
              {{ newPatch.count > 1 ? `Apply ${newPatch.count} Patches` : 'Apply Patch' }}
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
                <option v-for="type in patchesStore.enabledPatchTypes" :key="type.id" :value="type.id">
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
                  <th class="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in patchesStore.inventory" :key="item.patchTypeId" class="border-b border-gray-200">
                  <td class="py-2">
                    <div class="flex items-center">
                      <img 
                        :src="patchesStore.getPatchImagePath(item.patchTypeId)" 
                        :alt="item.patchTypeId" 
                        class="w-12 h-12 mr-3"
                      />
                      <div>
                        <h4 class="font-semibold">
                          {{ getPatchTypeName(item.patchTypeId) }}
                          <span v-if="!patchesStore.getPatchType(item.patchTypeId)?.enabled" class="text-xs text-gray-500 ml-1">(disabled)</span>
                        </h4>
                        <p>
                          <span class="text-sm">Duration: {{ (patchesStore.getPatchType(item.patchTypeId)?.durationHours || 0) / 24 }} days</span>
                        </p>
                        <p>
                          <span 
                            class="text-sm font-semibold"
                            :class="{
                              'text-red-600': item.count <= 0,
                              'text-orange-600': item.count > 0 && item.count < 3,
                              'text-green-600': item.count >= 3
                            }"
                          >
                            Inventory: {{ item.count }}
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="py-2 text-right font-medium" :class="item.count <= 3 && patchesStore.getPatchType(item.patchTypeId)?.enabled ? 'text-red-600' : ''">
                    {{ item.count }}
                  </td>
                  <td class="py-2 text-right">
                    <button 
                      @click="removeFromInventory(item.patchTypeId, 1)" 
                      class="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 mr-1 text-xs"
                      :disabled="item.count <= 0"
                    >
                      -1
                    </button>
                    <button 
                      @click="removeFromInventory(item.patchTypeId, 0, true)" 
                      class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                      :disabled="item.count <= 0"
                    >
                      Remove All
                    </button>
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
              
              <div class="flex">
                <button 
                  @click="unapplyPatch(application.id)" 
                  class="text-blue-500 hover:text-blue-700 mr-3"
                  title="Unapply this patch and return to inventory"
                >
                  Unapply
                </button>
                <button 
                  @click="removePatch(application.id)" 
                  class="text-red-500 hover:text-red-700"
                  title="Remove this record (does not return to inventory)"
                >
                  ✕
                </button>
              </div>
            </div>
            <img 
              :src="patchesStore.getPatchImagePath(application.patchTypeId)" 
              :alt="patchesStore.getPatchType(application.patchTypeId)?.name" 
              class="w-12 h-12 mr-3"
            />
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 