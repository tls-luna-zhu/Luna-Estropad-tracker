import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export interface PatchType {
  id: string
  name: string
  durationHours: number
  imageUrl?: string
}

export interface PatchInventory {
  patchTypeId: string
  count: number
}

export interface PatchApplication {
  id: string
  patchTypeId: string
  appliedAt: string // ISO date string
  location: string
  notes?: string
}

export const usePatchesStore = defineStore('patches', () => {
  // Available patch types
  const patchTypes = ref<PatchType[]>([
    {
      id: 'estradiol-2day',
      name: 'Estradiol (2 day)',
      durationHours: 48,
      imageUrl: '/images/patch-2day.png'
    },
    {
      id: 'estradiol-week',
      name: 'Estradiol (Weekly)',
      durationHours: 168,
      imageUrl: '/images/patch-week.png'
    }
  ])

  // Patch inventory (persistent)
  const inventory = useLocalStorage<PatchInventory[]>('patch-inventory', [
    { patchTypeId: 'estradiol-2day', count: 10 },
    { patchTypeId: 'estradiol-week', count: 5 }
  ])

  // Patch application history (persistent)
  const applications = useLocalStorage<PatchApplication[]>('patch-applications', [])

  // Add new patch application
  function applyPatch(patchTypeId: string, location: string, notes?: string) {
    // Check if we have patches in inventory
    const inventoryItem = inventory.value.find(item => item.patchTypeId === patchTypeId)
    
    if (!inventoryItem || inventoryItem.count <= 0) {
      throw new Error('No patches available in inventory')
    }
    
    // Decrease inventory
    inventoryItem.count--
    
    // Add application record
    const newApplication: PatchApplication = {
      id: Date.now().toString(),
      patchTypeId,
      appliedAt: new Date().toISOString(),
      location,
      notes
    }
    
    applications.value.push(newApplication)
    
    return newApplication
  }

  // Add patches to inventory
  function addToInventory(patchTypeId: string, count: number) {
    const inventoryItem = inventory.value.find(item => item.patchTypeId === patchTypeId)
    
    if (inventoryItem) {
      inventoryItem.count += count
    } else {
      inventory.value.push({ patchTypeId, count })
    }
  }

  // Remove a patch application record
  function removeApplication(applicationId: string) {
    const index = applications.value.findIndex(app => app.id === applicationId)
    
    if (index !== -1) {
      applications.value.splice(index, 1)
    }
  }

  // Get a patch type by ID
  function getPatchType(patchTypeId: string) {
    return patchTypes.value.find(type => type.id === patchTypeId)
  }

  // Active patches that need to be changed
  const activePatches = computed(() => {
    const now = new Date()
    
    return applications.value
      .map(app => {
        const patchType = getPatchType(app.patchTypeId)
        const appliedAt = new Date(app.appliedAt)
        
        // Calculate when the patch should be changed
        const changeAt = new Date(appliedAt)
        changeAt.setHours(changeAt.getHours() + (patchType?.durationHours || 0))
        
        // Calculate time remaining
        const timeRemaining = changeAt.getTime() - now.getTime()
        const isExpired = timeRemaining <= 0
        
        return {
          ...app,
          patchType,
          appliedAt,
          changeAt,
          timeRemaining,
          isExpired
        }
      })
      .sort((a, b) => a.changeAt.getTime() - b.changeAt.getTime())
  })

  // Low inventory alerts
  const lowInventoryAlerts = computed(() => {
    const LOW_THRESHOLD = 3
    
    return inventory.value
      .filter(item => item.count <= LOW_THRESHOLD)
      .map(item => {
        const patchType = getPatchType(item.patchTypeId)
        return {
          ...item,
          patchType,
          isOut: item.count === 0
        }
      })
  })

  return {
    patchTypes,
    inventory,
    applications,
    activePatches,
    lowInventoryAlerts,
    applyPatch,
    addToInventory,
    removeApplication,
    getPatchType
  }
}) 