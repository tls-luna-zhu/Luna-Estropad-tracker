<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { usePatchesStore } from '@/stores/patches'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const patchesStore = usePatchesStore()

// Local copy of preferences for the form
const preferences = ref({
  enableBrowserNotifications: notificationsStore.preferences.enableBrowserNotifications,
  enableEmailNotifications: notificationsStore.preferences.enableEmailNotifications,
  notifyBeforeHours: notificationsStore.preferences.notifyBeforeHours,
  emailAddress: notificationsStore.preferences.emailAddress || ''
})

// Form for adding/editing patch types
const editingPatchType = ref<string | null>(null)
const newPatchType = ref({
  name: '',
  durationDays: 2,
  isAdding: false
})

// Whether browser notifications are supported
const supportsNotifications = ref(false)

// Initialize on mount
onMounted(() => {
  authStore.init()
  
  // Check if browser supports notifications
  supportsNotifications.value = 'Notification' in window
})

// Save notification preferences
const saveNotificationSettings = async () => {
  // Validate email if email notifications are enabled
  if (preferences.value.enableEmailNotifications && !validateEmail(preferences.value.emailAddress)) {
    ElMessage.error('Please enter a valid email address')
    return
  }
  
  // If browser notifications are being enabled, request permission
  if (preferences.value.enableBrowserNotifications &&
      notificationsStore.notificationPermission !== 'granted') {
    const granted = await notificationsStore.requestNotificationPermission()
    
    if (!granted) {
      ElMessage.warning('Browser notification permission was denied')
      preferences.value.enableBrowserNotifications = false
    }
  }
  
  // Update notification preferences
  notificationsStore.updateNotificationPreferences({
    enableBrowserNotifications: preferences.value.enableBrowserNotifications,
    enableEmailNotifications: preferences.value.enableEmailNotifications,
    notifyBeforeHours: preferences.value.notifyBeforeHours,
    emailAddress: preferences.value.emailAddress
  })
  
  ElMessage.success('Settings saved successfully')
}

// Helper to validate email format
function validateEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Handle logout
const logout = () => {
  authStore.logout()
  router.push('/login')
  ElMessage.success('You have been logged out')
}

// Test browser notification
const testNotification = () => {
  if (notificationsStore.notificationPermission !== 'granted') {
    ElMessage.warning('Notification permission not granted')
    return
  }
  
  notificationsStore.sendBrowserNotification(
    'Test Notification',
    {
      body: 'This is a test notification from Luna\'s EstroPad Tracker',
      icon: '/favicon.svg'
    }
  )
  
  ElMessage.success('Test notification sent')
}

// Toggle patch type enabled/disabled
const togglePatchTypeEnabled = (patchTypeId: string) => {
  patchesStore.togglePatchTypeEnabled(patchTypeId)
  ElMessage.success('Patch type settings updated')
}

// Start editing a patch type
const startEditingPatchType = (patchTypeId: string) => {
  const patchType = patchesStore.getPatchType(patchTypeId)
  if (!patchType) return
  
  editingPatchType.value = patchTypeId
  newPatchType.value = {
    name: patchType.name,
    durationDays: patchType.durationHours / 24,
    isAdding: false
  }
}

// Start adding a new patch type
const startAddingPatchType = () => {
  editingPatchType.value = null
  newPatchType.value = {
    name: 'Custom Patch',
    durationDays: 3,
    isAdding: true
  }
}

// Cancel editing/adding
const cancelPatchTypeEdit = () => {
  editingPatchType.value = null
  newPatchType.value = {
    name: '',
    durationDays: 2,
    isAdding: false
  }
}

// Save patch type changes
const savePatchTypeChanges = () => {
  try {
    if (!newPatchType.value.name.trim()) {
      ElMessage.warning('Please enter a valid name')
      return
    }
    
    if (newPatchType.value.durationDays <= 0) {
      ElMessage.warning('Duration must be greater than 0')
      return
    }
    
    // Convert days to hours
    const durationHours = newPatchType.value.durationDays * 24
    
    if (newPatchType.value.isAdding) {
      // Adding a new custom patch type
      patchesStore.addCustomPatchType({
        name: newPatchType.value.name.trim(),
        durationHours
      })
      ElMessage.success('Custom patch type added')
    } else if (editingPatchType.value) {
      // Editing an existing patch type
      patchesStore.editPatchType(editingPatchType.value, {
        name: newPatchType.value.name.trim(),
        durationHours
      })
      ElMessage.success('Patch type updated')
    }
    
    // Reset form
    cancelPatchTypeEdit()
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('Failed to save patch type')
    }
    console.error('Error saving patch type:', error)
  }
}

// Delete a custom patch type
const deleteCustomPatchType = async (patchTypeId: string) => {
  try {
    const patchType = patchesStore.getPatchType(patchTypeId)
    if (!patchType || !patchType.isCustom) return
    
    await ElMessageBox.confirm(
      `Are you sure you want to delete the custom patch type "${patchType.name}"?`,
      'Confirm Deletion',
      {
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    patchesStore.deleteCustomPatchType(patchTypeId)
    ElMessage.success('Custom patch type deleted')
  } catch (error) {
    // User canceled the operation
    if (error !== 'cancel') {
      if (error instanceof Error) {
        ElMessage.error(error.message)
      } else {
        ElMessage.error('Failed to delete patch type')
      }
      console.error('Error deleting patch type:', error)
    }
  }
}

// Check if a patch type is being edited
const isEditing = computed(() => {
  return editingPatchType.value !== null || newPatchType.value.isAdding
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
      <h2 class="text-2xl mb-6 text-primary-700">Settings</h2>
      
      <!-- Account -->
      <div class="pixel-card mb-6">
        <h3 class="text-xl mb-4 text-primary-700">Account</h3>
        
        <div v-if="authStore.user" class="mb-4">
          <p><strong>Username:</strong> {{ authStore.user.username }}</p>
          <p><strong>Email:</strong> {{ authStore.user.email }}</p>
        </div>
        
        <button 
          @click="logout" 
          class="pixel-btn bg-red-500 hover:bg-red-600 text-white"
        >
          Logout
        </button>
      </div>
      
      <!-- Patch Types -->
      <div class="pixel-card mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl text-primary-700">Patch Types</h3>
          <button 
            v-if="!isEditing"
            @click="startAddingPatchType" 
            class="pixel-btn bg-secondary-500 hover:bg-secondary-600 text-white text-sm"
          >
            Add Custom Patch
          </button>
        </div>
        
        <!-- Add/Edit Form -->
        <div v-if="isEditing" class="mb-6 p-4 border border-secondary-300 bg-secondary-50 rounded">
          <h4 class="font-semibold mb-3">
            {{ newPatchType.isAdding ? 'Add Custom Patch Type' : 'Edit Patch Type' }}
          </h4>
          
          <div class="space-y-4">
            <div>
              <label for="patchName" class="block mb-1">Patch Name</label>
              <input 
                id="patchName"
                v-model="newPatchType.name"
                type="text" 
                class="pixel-input w-full"
                placeholder="e.g., Custom Estradiol, Estradiol 3-day, etc."
                required
              />
            </div>
            
            <div>
              <label for="patchDuration" class="block mb-1">Duration (days)</label>
              <input 
                id="patchDuration"
                v-model.number="newPatchType.durationDays"
                type="number" 
                class="pixel-input w-full"
                min="0.5"
                step="0.5" 
                required
              />
              <p class="text-sm text-gray-600 mt-1">
                How many days before the patch needs to be changed
              </p>
            </div>
            
            <div class="flex justify-end gap-2 mt-4">
              <button 
                @click="cancelPatchTypeEdit" 
                class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                @click="savePatchTypeChanges" 
                class="pixel-btn bg-secondary-500 hover:bg-secondary-600 text-white"
              >
                {{ newPatchType.isAdding ? 'Add Patch Type' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
        
        <p class="text-sm text-gray-600 mb-4">
          Enable or disable patch types based on your needs. Disabled patch types will not show alerts for low inventory.
          You can also edit existing patch types to match your specific dosage and duration.
        </p>
        
        <div class="space-y-4">
          <div 
            v-for="patchType in patchesStore.patchTypes" 
            :key="patchType.id" 
            class="flex items-center justify-between p-3 border border-gray-200 rounded"
            :class="{ 'bg-gray-50': !patchType.enabled }"
          >
            <div class="flex items-center">
              <input 
                :id="`patch-type-${patchType.id}`"
                type="checkbox"
                :checked="patchType.enabled"
                @change="togglePatchTypeEnabled(patchType.id)"
                class="mr-3"
              />
              <div>
                <label :for="`patch-type-${patchType.id}`" class="cursor-pointer font-medium">
                  {{ patchType.name }}
                  <span v-if="patchType.isCustom" class="text-xs text-purple-600 ml-1">(Custom)</span>
                </label>
                <p class="text-sm text-gray-600">
                  Duration: {{ patchType.durationHours / 24 }} days
                </p>
              </div>
            </div>
            
            <div class="flex gap-2">
              <button 
                v-if="!isEditing"
                @click="startEditingPatchType(patchType.id)" 
                class="px-2 py-1 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 text-sm"
                title="Edit patch type"
              >
                Edit
              </button>
              <button 
                v-if="!isEditing && patchType.isCustom"
                @click="deleteCustomPatchType(patchType.id)" 
                class="px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 text-sm"
                title="Delete this custom patch type"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Notification Settings -->
      <div class="pixel-card mb-6">
        <h3 class="text-xl mb-4 text-primary-700">Notification Settings</h3>
        
        <form @submit.prevent="saveNotificationSettings" class="space-y-4">
          <!-- Browser Notifications -->
          <div>
            <div class="flex items-center mb-2">
              <input 
                id="enableBrowserNotifications"
                v-model="preferences.enableBrowserNotifications"
                type="checkbox" 
                class="mr-2"
                :disabled="!supportsNotifications"
              />
              <label for="enableBrowserNotifications">Enable Browser Notifications</label>
            </div>
            <p v-if="!supportsNotifications" class="text-sm text-red-600 ml-6">
              Your browser does not support notifications.
            </p>
            <p v-else-if="notificationsStore.notificationPermission === 'denied'" class="text-sm text-red-600 ml-6">
              Notification permission denied. Please enable notifications in your browser settings.
            </p>
            <button 
              v-else-if="preferences.enableBrowserNotifications && notificationsStore.notificationPermission === 'granted'"
              type="button"
              @click="testNotification"
              class="text-sm text-secondary-600 hover:text-secondary-800 ml-6 underline"
            >
              Send test notification
            </button>
          </div>
          
          <!-- Email Notifications -->
          <div>
            <div class="flex items-center mb-2">
              <input 
                id="enableEmailNotifications"
                v-model="preferences.enableEmailNotifications"
                type="checkbox" 
                class="mr-2"
              />
              <label for="enableEmailNotifications">Enable Email Notifications</label>
            </div>
            
            <div v-if="preferences.enableEmailNotifications" class="ml-6">
              <label for="emailAddress" class="block mb-1">Email Address</label>
              <input 
                id="emailAddress"
                v-model="preferences.emailAddress"
                type="email" 
                class="pixel-input w-full" 
                placeholder="your@email.com"
                required
              />
            </div>
          </div>
          
          <!-- Notification Timing -->
          <div>
            <label for="notifyBeforeHours" class="block mb-1">Notify Before (hours)</label>
            <p class="text-sm text-gray-600 mb-2">
              How many hours before a patch needs to be changed would you like to be notified?
            </p>
            <input 
              id="notifyBeforeHours"
              v-model.number="preferences.notifyBeforeHours"
              type="number" 
              class="pixel-input w-full" 
              min="1"
              max="72"
              required
            />
          </div>
          
          <div class="pt-2">
            <button 
              type="submit" 
              class="pixel-btn w-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
      
      <!-- App Info -->
      <div class="pixel-card">
        <h3 class="text-xl mb-4 text-primary-700">About</h3>
        <p class="mb-2"><strong>Luna's EstroPad Tracker</strong> v0.1.0</p>
        <p class="text-sm text-gray-600">
          A specialized application designed to help MTF transgender individuals track
          their estrogen patch applications, inventory, and receive timely reminders.
        </p>
      </div>
    </main>
  </div>
</template> 