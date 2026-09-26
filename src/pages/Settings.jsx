import { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  UploadCloud,
  Smartphone,
  Copy,
  Check,
  HelpCircle,
  Database
} from 'lucide-react'
import {
  getFirebaseConfig,
  saveFirebaseConfig,
  removeFirebaseConfig,
  resetFirebaseInstance,
  testFirebaseConnection,
  uploadAllStateToCloud
} from '../services/firebase'

function parseConfigInput(text) {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    if (parsed.apiKey && parsed.projectId) return parsed
  } catch {}

  const getMatch = (key) => {
    const m = text.match(new RegExp(`${key}\\s*[:=]\\s*['"]([^'"]+)['"]`))
    return m ? m[1] : ''
  }

  const apiKey = getMatch('apiKey')
  const authDomain = getMatch('authDomain')
  const projectId = getMatch('projectId')
  const storageBucket = getMatch('storageBucket')
  const messagingSenderId = getMatch('messagingSenderId')
  const appId = getMatch('appId')

  if (apiKey && projectId) {
    return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId }
  }
  return null
}

export default function Settings() {
  const { settings, setSettings, resetAll, cloudSyncStatus, lastSyncTime } = useStore()
  const [companyName, setCompanyName] = useState(settings.companyName || '')
  const [phone, setPhone] = useState(settings.phone || '')
  const [address, setAddress] = useState(settings.address || '')
  const [logoDataUrl, setLogoDataUrl] = useState(settings.logoDataUrl || '')
  const [salesTaxPercent, setSalesTaxPercent] = useState(Number(settings.salesTaxPercent || 0))
  const [savedOpen, setSavedOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Firebase Cloud Sync State
  const [activeTab, setActiveTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [fbConfig, setFbConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  })
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [copiedRule, setCopiedRule] = useState(false)

  useEffect(() => {
    const current = getFirebaseConfig()
    if (current) {
      setFbConfig(current)
      setPasteText(JSON.stringify(current, null, 2))
    }
  }, [])

  const onSaveCompany = () => {
    setSettings({ companyName, phone, address, logoDataUrl, salesTaxPercent: Number(salesTaxPercent || 0) })
    setSavedOpen(true)
  }

  const onUploadLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      setLogoDataUrl(String(dataUrl))
    }
    reader.readAsDataURL(file)
  }

  const onExport = () => {
    try {
      const raw = localStorage.getItem('mobile-shop-state') || '{}'
      const blob = new Blob([raw], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mobile-shop-export.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to export data')
    }
  }

  const onImport = async (e) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      JSON.parse(text)
      localStorage.setItem('mobile-shop-state', text)
      location.reload()
    } catch (err) {
      alert('Invalid import file')
    }
  }

  const handleTestAndConnect = async () => {
    let configToUse = null
    if (activeTab === 'paste') {
      configToUse = parseConfigInput(pasteText)
      if (!configToUse) {
        setTestResult({ success: false, error: 'Could not find valid apiKey and projectId in pasted text.' })
        return
      }
      setFbConfig(configToUse)
    } else {
      if (!fbConfig.apiKey || !fbConfig.projectId) {
        setTestResult({ success: false, error: 'API Key and Project ID are required.' })
        return
      }
      configToUse = fbConfig
    }

    setIsTesting(true)
    setTestResult(null)
    setUploadResult(null)

    const result = await testFirebaseConnection(configToUse)
    setIsTesting(false)
    setTestResult(result)

    if (result.success) {
      saveFirebaseConfig(configToUse)
      resetFirebaseInstance()
      // Reload page to let CloudSyncManager initialize with new credentials
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    }
  }

  const handleDisconnectFirebase = () => {
    if (confirm('Disconnect Firebase cloud database? The app will revert to local browser storage.')) {
      removeFirebaseConfig()
      resetFirebaseInstance()
      window.location.reload()
    }
  }

  const handleUploadAllToCloud = async () => {
    if (!confirm('This will upload all current local inventory, sales, customers, and settings to your Firebase cloud database. Continue?')) {
      return
    }

    setIsUploading(true)
    setUploadResult(null)
    try {
      const currentState = useStore.getState()
      await uploadAllStateToCloud(currentState)
      setUploadResult({ success: true, message: 'All local data successfully synced to Firebase Cloud!' })
    } catch (err) {
      setUploadResult({ success: false, message: err.message || 'Failed to upload state' })
    } finally {
      setIsUploading(false)
    }
  }

  const firestoreRuleText = `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`

  const copyRule = () => {
    navigator.clipboard.writeText(firestoreRuleText)
    setCopiedRule(true)
    setTimeout(() => setCopiedRule(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
      </div>

      {/* CLOUD DATABASE & MOBILE SYNC (FIREBASE) */}
      <Card 
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Database className="text-brand w-5 h-5" />
              <span>Free Cloud Database & Mobile Phone Sync (Firebase)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border">
              {cloudSyncStatus === 'connected' ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected (Live Cloud Sync)
                </span>
              ) : cloudSyncStatus === 'connecting' ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <RefreshCw size={13} className="animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <CloudOff size={13} />
                  Local Storage Only
                </span>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Connect a <strong>100% Free Google Firebase Firestore</strong> database. This enables your shop data to sync in real-time across your PC and Mobile Phone with no server cost.
          </p>

          {/* Quick guide toggle button */}
          <button 
            type="button" 
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium cursor-pointer"
          >
            <HelpCircle size={16} />
            {showInstructions ? 'Hide setup instructions' : 'How to get your free Firebase config in 3 minutes (Click here)'}
          </button>

          {/* Step by Step Guide */}
          {showInstructions && (
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-slate-900 border border-blue-200 dark:border-slate-700 text-sm space-y-3">
              <div className="font-semibold text-blue-900 dark:text-blue-300">Quick 3-Minute Free Setup:</div>
              <ol className="list-decimal pl-5 space-y-2 text-slate-700 dark:text-slate-300">
                <li>
                  Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline inline-flex items-center gap-0.5 font-medium">Firebase Console <ExternalLink size={12} /></a> and sign in with your Google account.
                </li>
                <li>
                  Click <strong>"Add project"</strong>, name it (e.g. <code>my-mobile-shop</code>), and create it (100% Free Spark plan, no credit card required).
                </li>
                <li>
                  In the left sidebar, click <strong>"Build" &rarr; "Firestore Database"</strong>, then click <strong>"Create database"</strong>. Choose your nearest location and start in <strong>Test mode</strong> (or paste the rules below into the Rules tab).
                </li>
                <li>
                  Click the <strong>Project Settings gear icon</strong> (top left next to Project Overview), scroll down to <strong>"Your apps"</strong>, and click the Web icon <code>&lt;/&gt;</code>.
                </li>
                <li>
                  Register the app name (e.g. <code>mobile-shop-web</code>) and copy the <code>firebaseConfig</code> object.
                </li>
                <li>
                  Paste the copied code below and click <strong>"Test & Connect Cloud"</strong>!
                </li>
              </ol>

              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>Firestore Rules (Allow shop read/write):</span>
                  <button onClick={copyRule} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs">
                    {copiedRule ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    {copiedRule ? 'Copied!' : 'Copy Rule'}
                  </button>
                </div>
                <pre className="p-2.5 rounded bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto">
                  {firestoreRuleText}
                </pre>
              </div>
            </div>
          )}

          {/* Config Input Tabs */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
              <button
                type="button"
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'paste' 
                    ? 'border-brand text-brand' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                onClick={() => setActiveTab('paste')}
              >
                Paste Code / JSON (Easiest)
              </button>
              <button
                type="button"
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'manual' 
                    ? 'border-brand text-brand' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                onClick={() => setActiveTab('manual')}
              >
                Manual Fields
              </button>
            </div>

            {activeTab === 'paste' ? (
              <div>
                <label className="label">Paste your Firebase Config snippet or JSON:</label>
                <textarea
                  className="input font-mono text-xs h-32 leading-relaxed"
                  placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "shop.firebaseapp.com",\n  projectId: "shop-123",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="label">API Key *</label>
                  <input 
                    className="input font-mono text-xs" 
                    value={fbConfig.apiKey} 
                    onChange={e => setFbConfig({ ...fbConfig, apiKey: e.target.value })} 
                    placeholder="AIzaSy..." 
                  />
                </div>
                <div>
                  <label className="label">Project ID *</label>
                  <input 
                    className="input font-mono text-xs" 
                    value={fbConfig.projectId} 
                    onChange={e => setFbConfig({ ...fbConfig, projectId: e.target.value })} 
                    placeholder="your-project-id" 
                  />
                </div>
                <div>
                  <label className="label">Auth Domain</label>
                  <input 
                    className="input font-mono text-xs" 
                    value={fbConfig.authDomain} 
                    onChange={e => setFbConfig({ ...fbConfig, authDomain: e.target.value })} 
                    placeholder="your-project-id.firebaseapp.com" 
                  />
                </div>
                <div>
                  <label className="label">Storage Bucket</label>
                  <input 
                    className="input font-mono text-xs" 
                    value={fbConfig.storageBucket} 
                    onChange={e => setFbConfig({ ...fbConfig, storageBucket: e.target.value })} 
                    placeholder="your-project-id.appspot.com" 
                  />
                </div>
                <div>
                  <label className="label">Messaging Sender ID</label>
                  <input 
                    className="input font-mono text-xs" 
                    value={fbConfig.messagingSenderId} 
                    onChange={e => setFbConfig({ ...fbConfig, messagingSenderId: e.target.value })} 
                    placeholder="123456789" 
                  />
                </div>
                <div>
                  <label className="label">App ID</label>
                  <input 
                    className="input font-mono text-xs" 
                    value={fbConfig.appId} 
                    onChange={e => setFbConfig({ ...fbConfig, appId: e.target.value })} 
                    placeholder="1:12345:web:abcdef" 
                  />
                </div>
              </div>
            )}

            {/* Test result messages */}
            {testResult && (
              <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${
                testResult.success ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200' : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200'
              }`}>
                {testResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                <div>
                  <div className="font-semibold">{testResult.success ? 'Connection Successful!' : 'Connection Failed'}</div>
                  <div className="text-xs mt-0.5">{testResult.success ? 'Config saved. Reloading app to connect to real-time sync...' : testResult.error}</div>
                </div>
              </div>
            )}

            {/* Upload result messages */}
            {uploadResult && (
              <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${
                uploadResult.success ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200' : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200'
              }`}>
                {uploadResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                <div className="text-xs">{uploadResult.message}</div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button 
                type="button" 
                className="btn-primary flex items-center gap-1.5" 
                onClick={handleTestAndConnect}
                disabled={isTesting}
              >
                {isTesting ? <RefreshCw size={15} className="animate-spin" /> : <Cloud size={15} />}
                {isTesting ? 'Testing Connection...' : 'Test & Connect Cloud'}
              </button>

              {cloudSyncStatus === 'connected' && (
                <>
                  <button 
                    type="button" 
                    className="btn-secondary flex items-center gap-1.5 text-blue-700 dark:text-blue-300"
                    onClick={handleUploadAllToCloud}
                    disabled={isUploading}
                    title="Upload all current inventory, sales, customers and settings to Firestore"
                  >
                    {isUploading ? <RefreshCw size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                    {isUploading ? 'Uploading...' : 'Upload Local Data to Cloud'}
                  </button>

                  <button 
                    type="button" 
                    className="btn-secondary text-red-600 hover:text-red-700" 
                    onClick={handleDisconnectFirebase}
                  >
                    Disconnect Cloud
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile phone access tips */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
            <Smartphone className="shrink-0 text-brand w-5 h-5 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-100">How to use on your Mobile Phone:</div>
              <div>
                1. Once you connect Firebase, deploy the website (or open your local IP with <code>--host</code> on the same Wi-Fi).
              </div>
              <div>
                2. Open the link in <strong>Chrome</strong> (Android) or <strong>Safari</strong> (iPhone) on your phone.
              </div>
              <div>
                3. Tap the browser menu (&vellip; or Share) and select <strong>"Add to Home screen"</strong>. It installs like an app and stays in real-time sync with your PC!
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* COMPANY INFORMATION */}
      <Card title="Company Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Company Name</label>
            <input className="input" value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Your company name" />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
            <div>
              <label className="label">Sales Tax (%)</label>
              <input type="number" className="input" value={salesTaxPercent} onChange={e=>setSalesTaxPercent(e.target.value)} placeholder="e.g., 0 or 17" />
              <div className="text-xs text-gray-500 mt-1">Set to 0 to remove tax from the receipt.</div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input className="input" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street, City" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Company Logo</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={onUploadLogo} />
              {logoDataUrl && (
                <img src={logoDataUrl} alt="logo preview" className="h-12 w-12 object-contain rounded border" />
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={onSaveCompany}>Save Company Info</button>
          <input id="importFile" type="file" accept="application/json" className="hidden" onChange={onImport} />
          <button className="btn-secondary" onClick={() => document.getElementById('importFile').click()}>Import Data</button>
          <button className="btn-secondary" onClick={onExport}>Export Data</button>
          <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => setDeleteOpen(true)}>Delete Data</button>
        </div>
      </Card>

      <Modal
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        title="Settings Saved"
        footer={(
          <button className="btn-primary" onClick={() => setSavedOpen(false)}>Okay</button>
        )}
      >
        <div className="space-y-2 text-sm">
          <div>Your company information has been updated.</div>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Header branding updates immediately.</li>
            <li>Receipts will use the latest company name, phone, address and logo.</li>
          </ul>
        </div>
      </Modal>

      {/* Delete Data Confirmation */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete All Data"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button
              className="btn-primary bg-red-600 hover:bg-red-700"
              onClick={() => { resetAll(); setDeleteOpen(false); window.location.assign('#/login') }}
            >Delete</button>
          </>
        )}
      >
        <div className="space-y-2 text-sm">
          <div>This will permanently delete all saved app data from this device.</div>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Inventory, sales, customers, expenses, and settings will be cleared.</li>
            <li>You will be signed out and redirected to the login screen.</li>
          </ul>
          <div className="text-xs text-red-600">This action cannot be undone.</div>
        </div>
      </Modal>
    </div>
  )
}
