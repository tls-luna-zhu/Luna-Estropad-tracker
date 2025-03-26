import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { usePatchesStore } from './patches'

export interface NotificationPreferences {
  enableBrowserNotifications: boolean
  enableEmailNotifications: boolean
  notifyBeforeHours: number
  emailAddress?: string
}

export const useNotificationsStore = defineStore('notifications', () => {
  // User notification preferences (persistent)
  const preferences = useLocalStorage<NotificationPreferences>('notification-preferences', {
    enableBrowserNotifications: true,
    enableEmailNotifications: false,
    notifyBeforeHours: 24,
    emailAddress: ''
  })

  // Permission status for browser notifications
  const notificationPermission = ref<NotificationPermission>('default')
  
  // Check and request notification permission
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false
    }
    
    // Check if permission is already granted
    if (Notification.permission === 'granted') {
      notificationPermission.value = 'granted'
      return true
    }
    
    // Request permission
    try {
      const permission = await Notification.requestPermission()
      notificationPermission.value = permission
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }
  
  // Send browser notification
  function sendBrowserNotification(title: string, options?: NotificationOptions) {
    if (!preferences.value.enableBrowserNotifications || notificationPermission.value !== 'granted') {
      return
    }
    
    try {
      new Notification(title, options)
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }
  
  // Mock function to send email notification
  function sendEmailNotification(to: string, subject: string, body: string) {
    if (!preferences.value.enableEmailNotifications || !preferences.value.emailAddress) {
      return
    }
    
    // In a real application, this would call an API endpoint to send an email
    console.log(`Email notification sent to ${to}:`, { subject, body })
    
    // For demo purposes, we'll show a browser notification instead
    if (notificationPermission.value === 'granted') {
      new Notification(`Email notification: ${subject}`, { body })
    }
  }

  // Schedule notification check
  function scheduleNotificationCheck() {
    // In a real application, you might use a service worker for more reliable scheduling
    // For now, we'll use a simple interval
    const INTERVAL = 60000 // Check every minute
    
    // Initial check
    checkForDueNotifications()
    
    // Set up interval
    const intervalId = setInterval(checkForDueNotifications, INTERVAL)
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(intervalId)
    })
  }

  // Check for notifications that should be sent
  function checkForDueNotifications() {
    const patchesStore = usePatchesStore()
    const { activePatches } = patchesStore
    
    const now = new Date()
    const notifyBeforeMs = preferences.value.notifyBeforeHours * 60 * 60 * 1000
    
    for (const patch of activePatches) {
      // Skip if already expired
      if (patch.isExpired) continue
      
      // Calculate time until change is needed
      const timeUntilChange = patch.changeAt.getTime() - now.getTime()
      
      // If change is due within notification window and not expired
      if (timeUntilChange > 0 && timeUntilChange <= notifyBeforeMs) {
        // Format time until change
        const hoursUntilChange = Math.ceil(timeUntilChange / (60 * 60 * 1000))
        
        // Send browser notification
        if (preferences.value.enableBrowserNotifications && notificationPermission.value === 'granted') {
          sendBrowserNotification(
            'Time to change your patch soon',
            {
              body: `Your ${patch.patchType?.name} patch will need to be changed in approximately ${hoursUntilChange} hours.`,
              icon: '/favicon.svg',
              tag: `patch-reminder-${patch.id}` // Prevent duplicate notifications
            }
          )
        }
        
        // Send email notification
        if (preferences.value.enableEmailNotifications && preferences.value.emailAddress) {
          sendEmailNotification(
            preferences.value.emailAddress,
            'Estrogen Patch Change Reminder',
            `Your ${patch.patchType?.name} patch will need to be changed in approximately ${hoursUntilChange} hours.`
          )
        }
      }
    }
    
    // Check for low inventory
    const { lowInventoryAlerts } = patchesStore
    
    for (const alert of lowInventoryAlerts) {
      if (alert.isOut) {
        // Out of stock notification
        sendBrowserNotification(
          'Out of patches!',
          {
            body: `You're out of ${alert.patchType?.name} patches. Please refill your prescription soon.`,
            icon: '/favicon.svg',
            tag: `inventory-out-${alert.patchTypeId}` // Prevent duplicate notifications
          }
        )
      } else if (preferences.value.enableBrowserNotifications && notificationPermission.value === 'granted') {
        // Low stock notification
        sendBrowserNotification(
          'Low patch inventory',
          {
            body: `You only have ${alert.count} ${alert.patchType?.name} patches left. Consider refilling your prescription soon.`,
            icon: '/favicon.svg',
            tag: `inventory-low-${alert.patchTypeId}` // Prevent duplicate notifications
          }
        )
      }
    }
  }

  // Update notification settings
  function updateNotificationPreferences(newPreferences: Partial<NotificationPreferences>) {
    preferences.value = { ...preferences.value, ...newPreferences }
    
    // If enabling browser notifications, request permission
    if (newPreferences.enableBrowserNotifications && notificationPermission.value !== 'granted') {
      requestNotificationPermission()
    }
  }

  // Initialize on first load
  function init() {
    // Check notification permission
    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
    }
    
    // Schedule notification checks
    scheduleNotificationCheck()
  }

  return {
    preferences,
    notificationPermission,
    init,
    requestNotificationPermission,
    updateNotificationPreferences,
    sendBrowserNotification,
    sendEmailNotification
  }
}) 