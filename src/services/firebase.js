import { initializeApp, getApps, getApp } from 'firebase/app'
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  off 
} from 'firebase/database'

const STORAGE_KEY = 'mobile_shop_firebase_config'

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDAvIf1NLR1W5oo6F6GySoUokCSmefS-No",
  authDomain: "mobileshop-management.firebaseapp.com",
  databaseURL: "https://mobileshop-management-default-rtdb.firebaseio.com",
  projectId: "mobileshop-management",
  storageBucket: "mobileshop-management.firebasestorage.app",
  messagingSenderId: "521653494400",
  appId: "1:521653494400:web:f2bb35ad56308f815dfc65",
  measurementId: "G-FBD9SWM6KF"
}

export const SYNC_CATEGORIES = [
  'inventory',
  'sales',
  'customers',
  'expenses',
  'returns',
  'companyReturns',
  'retailerSales',
  'repairs',
  'purchaseHistory',
  'suppliers',
  'users',
  'settings',
  'colors'
]

// Retrieve saved, env or default config
export function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && parsed.apiKey && (parsed.projectId || parsed.databaseURL)) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Error reading saved Firebase config:', e)
  }

  // Fallback to Vite environment variables
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_CONFIG.databaseURL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId
    }
  }

  return DEFAULT_FIREBASE_CONFIG
}

export function saveFirebaseConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function removeFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

let dbInstance = null
let currentApp = null

export function getDb() {
  if (dbInstance) return dbInstance

  const config = getFirebaseConfig()
  if (!config || !config.apiKey) {
    return null
  }

  try {
    const apps = getApps()
    currentApp = apps.length ? getApp() : initializeApp(config)
    dbInstance = getDatabase(currentApp)
    return dbInstance
  } catch (err) {
    console.error('Failed to initialize Firebase DB:', err)
    return null
  }
}

// Reset instance when config changes
export function resetFirebaseInstance() {
  dbInstance = null
  currentApp = null
}

// Quick connection test
export async function testFirebaseConnection(config) {
  try {
    const tempAppName = 'test-firebase-connection-' + Date.now()
    const tempApp = initializeApp(config, tempAppName)
    const testDb = getDatabase(tempApp)
    const pingRef = ref(testDb, '_ping')
    await set(pingRef, { ping: Date.now(), client: 'web' })
    const snapshot = await get(pingRef)
    return { success: snapshot.exists(), error: null }
  } catch (err) {
    return { success: false, error: err.message || String(err) }
  }
}

// Subscriptions storage to allow unsubscribe
let activeUnsubscribers = []

export function subscribeToCloudSync(onCategoryUpdated, onStatusChanged) {
  unsubscribeFromCloudSync()

  const db = getDb()
  if (!db) {
    if (onStatusChanged) onStatusChanged('disconnected')
    return () => {}
  }

  if (onStatusChanged) onStatusChanged('connecting')

  let hasConnectedOnce = false

  SYNC_CATEGORIES.forEach((cat) => {
    try {
      const catRef = ref(db, 'shop/' + cat)
      const unsub = onValue(catRef, (snapshot) => {
        if (!hasConnectedOnce) {
          hasConnectedOnce = true
          if (onStatusChanged) onStatusChanged('connected')
        }
        if (snapshot.exists()) {
          const val = snapshot.val()
          if (val !== null && val !== undefined) {
            onCategoryUpdated(cat, val)
          }
        }
      }, (error) => {
        console.error(`Firebase realtime database error on ${cat}:`, error)
        if (onStatusChanged) onStatusChanged('error')
      })

      activeUnsubscribers.push(() => off(catRef))
    } catch (e) {
      console.error(`Failed to setup listener for ${cat}:`, e)
    }
  })

  return unsubscribeFromCloudSync
}

export function unsubscribeFromCloudSync() {
  activeUnsubscribers.forEach((fn) => {
    try { fn() } catch {}
  })
  activeUnsubscribers = []
}

// Debounce map for writes per category to avoid spamming the database
const debounceTimers = {}

export function saveCategoryToCloud(category, data) {
  const db = getDb()
  if (!db) return Promise.resolve(false)

  return new Promise((resolve) => {
    if (debounceTimers[category]) {
      clearTimeout(debounceTimers[category])
    }

    debounceTimers[category] = setTimeout(async () => {
      try {
        const catRef = ref(db, 'shop/' + category)
        // Clean data: undefined cannot be saved in Firebase RTDB
        const cleanData = JSON.parse(JSON.stringify(data ?? null))
        await set(catRef, cleanData)
        resolve(true)
      } catch (err) {
        console.error(`Failed to save ${category} to cloud:`, err)
        resolve(false)
      }
    }, 600)
  })
}

// Push all current local state to Cloud in one batch
export async function uploadAllStateToCloud(state) {
  const db = getDb()
  if (!db) throw new Error('Firebase is not configured or connected.')

  const promises = SYNC_CATEGORIES.map(async (cat) => {
    const catRef = ref(db, 'shop/' + cat)
    const val = state[cat] ?? null
    const cleanData = JSON.parse(JSON.stringify(val))
    return set(catRef, cleanData)
  })

  await Promise.all(promises)
  return true
}
