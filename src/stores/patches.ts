import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export interface PatchType {
  id: string
  name: string
  durationHours: number
  imageUrl?: string
  imagePath?: string  // Alias for imageUrl for compatibility
  enabled?: boolean
  isCustom?: boolean
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
  // Available patch types with enabled status
  const patchTypes = useLocalStorage<PatchType[]>('patch-types', [
    {
      id: 'estradiol-2day',
      name: 'Estradiol (2 day)',
      durationHours: 48,
      imageUrl: '/images/patch-2day.svg',
      enabled: true,
      isCustom: false
    },
    {
      id: 'estradiol-week',
      name: 'Estradiol (Weekly)',
      durationHours: 168,
      imageUrl: '/images/patch-week.svg',
      enabled: true,
      isCustom: false
    }
  ])

  // Patch inventory (persistent)
  const inventory = useLocalStorage<PatchInventory[]>('patch-inventory', [
    { patchTypeId: 'estradiol-2day', count: 10 },
    { patchTypeId: 'estradiol-week', count: 5 }
  ])

  // Patch application history (persistent)
  const applications = useLocalStorage<PatchApplication[]>('patch-applications', [])

  // Get enabled patch types
  const enabledPatchTypes = computed(() => {
    return patchTypes.value.filter(type => type.enabled)
  })

  // Toggle patch type enabled status
  function togglePatchTypeEnabled(patchTypeId: string) {
    const patchType = patchTypes.value.find(type => type.id === patchTypeId)
    if (patchType) {
      patchType.enabled = !patchType.enabled
    }
  }

  // Edit an existing patch type
  function editPatchType(patchTypeId: string, data: { name: string, durationHours: number }) {
    const patchTypeIndex = patchTypes.value.findIndex(type => type.id === patchTypeId)
    
    if (patchTypeIndex === -1) {
      throw new Error('Patch type not found')
    }
    
    // Update the patch type
    patchTypes.value[patchTypeIndex] = {
      ...patchTypes.value[patchTypeIndex],
      name: data.name,
      durationHours: data.durationHours
    }
    
    return patchTypes.value[patchTypeIndex]
  }

  // Add a new custom patch type
  function addCustomPatchType(data: { name: string, durationHours: number }) {
    // Generate a unique ID
    const id = `custom-${Date.now()}`
    
    // Create the new patch type
    const newPatchType: PatchType = {
      id,
      name: data.name,
      durationHours: data.durationHours,
      imageUrl: '/images/patch-custom.svg',
      imagePath: '/images/patch-custom.svg',
      enabled: true,
      isCustom: true
    }
    
    // Add to the list
    patchTypes.value.push(newPatchType)
    
    // Initialize inventory for this patch type
    inventory.value.push({ patchTypeId: id, count: 0 })
    
    return newPatchType
  }

  // Delete a custom patch type
  function deleteCustomPatchType(patchTypeId: string) {
    const patchType = patchTypes.value.find(type => type.id === patchTypeId)
    
    // Only allow deletion of custom types
    if (!patchType || !patchType.isCustom) {
      throw new Error('Only custom patch types can be deleted')
    }
    
    // Check if there are active applications using this patch type
    const hasActiveApplications = applications.value.some(app => app.patchTypeId === patchTypeId)
    
    if (hasActiveApplications) {
      throw new Error('Cannot delete patch type with active applications')
    }
    
    // Remove from patch types
    patchTypes.value = patchTypes.value.filter(type => type.id !== patchTypeId)
    
    // Remove from inventory
    inventory.value = inventory.value.filter(item => item.patchTypeId !== patchTypeId)
  }

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

  // Unapply a patch - remove the application record and return the patch to inventory
  function unapplyPatch(applicationId: string) {
    // Find the application record
    const applicationIndex = applications.value.findIndex(app => app.id === applicationId)
    
    if (applicationIndex === -1) {
      throw new Error('Application record not found')
    }
    
    // Get the patch type ID before removing the record
    const patchTypeId = applications.value[applicationIndex].patchTypeId
    
    // Remove the application record
    applications.value.splice(applicationIndex, 1)
    
    // Return the patch to inventory
    const inventoryItem = inventory.value.find(item => item.patchTypeId === patchTypeId)
    
    if (inventoryItem) {
      inventoryItem.count++
    } else {
      // If somehow the patch type is no longer in inventory, add it
      inventory.value.push({ patchTypeId, count: 1 })
    }
    
    return patchTypeId
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

  // Remove patches from inventory
  function removeFromInventory(patchTypeId: string, count: number) {
    const inventoryItem = inventory.value.find(item => item.patchTypeId === patchTypeId)
    
    if (inventoryItem) {
      inventoryItem.count = Math.max(0, inventoryItem.count - count)
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

  // Low inventory alerts (only for enabled patch types)
  const lowInventoryAlerts = computed(() => {
    const LOW_THRESHOLD = 3
    
    return inventory.value
      .filter(item => {
        // Only include enabled patch types
        const patchType = getPatchType(item.patchTypeId)
        return patchType?.enabled && item.count <= LOW_THRESHOLD
      })
      .map(item => {
        const patchType = getPatchType(item.patchTypeId)
        return {
          ...item,
          patchType,
          isOut: item.count === 0
        }
      })
  })

  // Get image path for a patch type (ensures compatibility with both imageUrl and imagePath properties)
  function getPatchImagePath(patchTypeId: string): string {
    const patchType = getPatchType(patchTypeId)
    // Use imageUrl or imagePath or fall back to the default
    const imagePath = patchType?.imageUrl || patchType?.imagePath || '/images/patch-default.svg'
    
    // Make sure we're using the .svg extension
    return imagePath.replace('.png', '.svg')
  }

  return {
    patchTypes,
    enabledPatchTypes,
    inventory,
    applications,
    activePatches,
    lowInventoryAlerts,
    togglePatchTypeEnabled,
    editPatchType,
    addCustomPatchType,
    deleteCustomPatchType,
    applyPatch,
    unapplyPatch,
    addToInventory,
    removeFromInventory,
    removeApplication,
    getPatchType,
    getPatchImagePath
  }
}) 