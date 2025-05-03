import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePatchesStore } from './patches'
import { useAuthStore } from './auth'
import { supabase } from '../utils/supabase'

export interface NotificationPreferences {
  enableBrowserNotifications: boolean
  enableEmailNotifications: boolean
  notifyBeforeHours: number
  emailAddress?: string
}

export const useNotificationsStore = defineStore('notifications', () => {
  // Default preferences
  const defaultPreferences: NotificationPreferences = {
    enableBrowserNotifications: true,
    enableEmailNotifications: false,
    notifyBeforeHours: 24,
    emailAddress: ''
  }

  // User notification preferences
  const preferences = ref<NotificationPreferences>({ ...defaultPreferences })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Permission status for browser notifications
  const notificationPermission = ref<NotificationPermission>('default')
  
  /**
   * Loads the current user's notification preferences from Supabase and updates the local state.
   *
   * If no preferences are found for the user, default preferences are saved and used. On error, falls back to default preferences.
   */
  async function loadPreferences() {
    const authStore = useAuthStore()
    if (!authStore.user) return
    
    isLoading.value = true
    
    try {
      const { data, error: supabaseError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', authStore.user.id)
        .single()
      
      if (supabaseError) throw supabaseError
      
      if (data) {
        preferences.value = {
          enableBrowserNotifications: data.enable_browser_notifications,
          enableEmailNotifications: data.enable_email_notifications,
          notifyBeforeHours: data.notify_before_hours,
          emailAddress: data.email_address || authStore.user.email
        }
      } else {
        // If no preferences found, create default ones
        await savePreferences(defaultPreferences)
      }
    } catch (err) {
      console.error('Error loading notification preferences:', err)
      // Fall back to default preferences
      preferences.value = { ...defaultPreferences }
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Saves updated notification preferences to Supabase for the authenticated user.
   *
   * Merges the provided preferences with the current local preferences and persists them to the `notification_preferences` table. Updates loading and error state accordingly.
   *
   * @param newPreferences - Partial set of notification preferences to update.
   */
  async function savePreferences(newPreferences: Partial<NotificationPreferences>) {
    const authStore = useAuthStore()
    if (!authStore.user) return
    
    isLoading.value = true
    error.value = null
    
    try {
      // Update local preferences
      preferences.value = { ...preferences.value, ...newPreferences }
      
      // Format for database
      const preferencesData = {
        user_id: authStore.user.id,
        enable_browser_notifications: preferences.value.enableBrowserNotifications,
        enable_email_notifications: preferences.value.enableEmailNotifications,
        notify_before_hours: preferences.value.notifyBeforeHours,
        email_address: preferences.value.emailAddress
      }
      
      // Upsert to database
      const { error: supabaseError } = await supabase
        .from('notification_preferences')
        .upsert(preferencesData, { onConflict: 'user_id' })
      
      if (supabaseError) throw supabaseError
    } catch (err: any) {
      error.value = err.message || 'Failed to save preferences'
      console.error('Error saving notification preferences:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Requests browser notification permission from the user if not already granted.
   *
   * Updates the store's notification permission state based on the user's response.
   *
   * @returns A promise that resolves to `true` if permission is granted, or `false` otherwise.
   */
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
  
  /**
   * Displays a browser notification with the specified title and options if browser notifications are enabled and permission is granted.
   *
   * @param title - The notification title.
   * @param options - Optional notification options.
   */
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
  
  /**
   * Sends an email notification if email notifications are enabled and an email address is set.
   *
   * In a production environment, this should call a Supabase Edge Function or external service to deliver the email. For demonstration purposes, it logs the notification details and displays a browser notification if permission is granted.
   *
   * @param to - The recipient's email address.
   * @param subject - The subject of the email notification.
   * @param body - The body content of the email notification.
   */
  function sendEmailNotification(to: string, subject: string, body: string) {
    if (!preferences.value.enableEmailNotifications || !preferences.value.emailAddress) {
      return
    }
    
    // In a real application, this would call a Supabase Edge Function or other service
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

  /**
   * Checks for upcoming patch changes and low inventory, sending notifications as needed.
   *
   * Sends browser and/or email notifications if a patch change is due within the user's configured notification window, or if patch inventory is low or depleted.
   *
   * @remark
   * Prevents duplicate browser notifications by using unique tags for each notification type.
   */
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

  /**
   * Updates the user's notification preferences and persists them to the database.
   *
   * If browser notifications are being enabled and permission has not yet been granted, requests notification permission from the user.
   *
   * @param newPreferences - Partial set of notification preferences to update.
   */
  async function updateNotificationPreferences(newPreferences: Partial<NotificationPreferences>) {
    await savePreferences(newPreferences)
    
    // If enabling browser notifications, request permission
    if (newPreferences.enableBrowserNotifications && notificationPermission.value !== 'granted') {
      requestNotificationPermission()
    }
  }

  /**
   * Initializes the notifications store by setting the current browser notification permission, loading user preferences from Supabase, and scheduling periodic notification checks.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  async function init() {
    // Check notification permission
    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
    }
    
    // Load user preferences
    await loadPreferences()
    
    // Schedule notification checks
    scheduleNotificationCheck()
  }

  return {
    preferences,
    notificationPermission,
    isLoading,
    error,
    init,
    loadPreferences,
    requestNotificationPermission,
    updateNotificationPreferences,
    sendBrowserNotification,
    sendEmailNotification
  }
}) 