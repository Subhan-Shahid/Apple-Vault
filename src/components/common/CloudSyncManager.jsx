import { useEffect, useRef } from 'react'
import useStore from '../../store/useStore'
import { 
  subscribeToCloudSync, 
  saveCategoryToCloud, 
  SYNC_CATEGORIES,
  getFirebaseConfig 
} from '../../services/firebase'

export default function CloudSyncManager() {
  const isReceivingRemote = useRef(false)
  const remoteTimer = useRef(null)

  useEffect(() => {
    const config = getFirebaseConfig()
    if (!config) {
      useStore.getState().setCloudSyncStatus('disconnected')
      return
    }

    const onCategoryUpdated = (cat, data) => {
      // Flag that this state change comes from Firestore
      isReceivingRemote.current = true
      if (remoteTimer.current) clearTimeout(remoteTimer.current)

      useStore.setState({ 
        [cat]: data, 
        lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      })

      remoteTimer.current = setTimeout(() => {
        isReceivingRemote.current = false
      }, 500)
    }

    const onStatusChanged = (status) => {
      useStore.getState().setCloudSyncStatus(status)
    }

    const unsubCloud = subscribeToCloudSync(onCategoryUpdated, onStatusChanged)

    // Listen to local Zustand state changes and push to Firestore
    const unsubStore = useStore.subscribe((state, prevState) => {
      if (isReceivingRemote.current) return
      if (state.cloudSyncStatus !== 'connected') return

      SYNC_CATEGORIES.forEach((cat) => {
        if (state[cat] !== prevState[cat]) {
          saveCategoryToCloud(cat, state[cat])
        }
      })
    })

    return () => {
      if (remoteTimer.current) clearTimeout(remoteTimer.current)
      unsubCloud()
      unsubStore()
    }
  }, [])

  return null
}
