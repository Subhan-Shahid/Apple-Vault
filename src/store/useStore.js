import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from '../utils/nanoid'
// business day helpers removed; using actual date selections on pages instead

const initialState = {
  user: { name: 'Admin', role: 'Manager' },
  ui: { sidebarOpen: true, darkMode: false },
  settings: {
    companyName: '',
    phone: '',
    address: '',
    logoDataUrl: '',
    salesTaxPercent: 0,
  },
  // Color master list for Inventory (persisted)
  colors: ['Red','Blue','White','Black','Gray','Silver'],
  mobiles: [],
  customers: [],
  sales: [],
  returns: [],
  // Company returns (to supplier/company)
  companyReturns: [],
  // Retailer/Wholesale sales
  retailerSales: [],
  repairs: [],
  bills: [],
  // Expenses
  expenses: [],
  // Backups of entire app state captured when business date changes
  backups: [],
  users: [
    { id: nanoid(), username: 'admin', password: 'admin123', role: 'Admin' },
  ],
  currentUser: null,
  suppliers: [],
  // POS (derived from inventory)
  posCatalog: [],
  purchaseHistory: [],
  posCart: [],
  // Inventory (mock)
  inventory: [],
  // Cloud Sync
  cloudSyncStatus: 'disconnected',
  lastSyncTime: null,
}

// Create a deep-ish snapshot of key data branches for backups
function makeSnapshot(state) {
  // Only copy serializable datasets, avoid functions
  return {
    settings: { ...state.settings },
    mobiles: JSON.parse(JSON.stringify(state.mobiles||[])),
    inventory: JSON.parse(JSON.stringify(state.inventory||[])),
    customers: JSON.parse(JSON.stringify(state.customers||[])),
    sales: JSON.parse(JSON.stringify(state.sales||[])),
    returns: JSON.parse(JSON.stringify(state.returns||[])),
    repairs: JSON.parse(JSON.stringify(state.repairs||[])),
    bills: JSON.parse(JSON.stringify(state.bills||[])),
    expenses: JSON.parse(JSON.stringify(state.expenses||[])),
    purchaseHistory: JSON.parse(JSON.stringify(state.purchaseHistory||[])),
    users: JSON.parse(JSON.stringify(state.users||[])),
    posCart: [], // ephemeral
    ui: { sidebarOpen: !!state.ui?.sidebarOpen, darkMode: !!state.ui?.darkMode },
  }
}

const useStore = create(persist((set, get) => ({
  ...initialState,

  // Backups
  backupCurrentDay: () => set((state) => ({
    backups: [
      ...state.backups,
      { date: new Date().toISOString().slice(0,10), data: makeSnapshot(state) }
    ]
  })),
  getBackupForDate: (date) => {
    const { backups } = get()
    return backups.find(b => b.date === date) || null
  },
  // removed day-open/close logic; date selection handled at page level

  // Mobiles
  addMobile: (payload) => set((state) => ({
    mobiles: [
      ...state.mobiles,
      { id: nanoid(), status: 'in_stock', ...payload }
    ]
  })),

  // Sales
  sellMobile: ({ mobileId, customer, price, date }) => set((state) => {
    const mobile = state.mobiles.find(m => m.id === mobileId)
    if (!mobile) return {}
    const sale = { id: nanoid(), mobileId, customer, price, date, profit: price - (mobile.purchasePrice || 0) }
    return {
      sales: [...state.sales, sale],
      mobiles: state.mobiles.map(m => m.id === mobileId ? { ...m, status: 'sold', sale } : m),
      customers: upsertCustomer(state.customers, sale),
    }
  }),

  // Company Return: remove a list of IMEIs for a given company from inventory and record entries
  processCompanyReturn: ({ company, imeis = [], date }) => {
    const { inventory, companyReturns } = get()
    const targetCompany = String(company||'').trim()
    const rmSet = new Set((imeis||[]).map(s=>String(s||'').trim()).filter(Boolean))
    if (!targetCompany || rmSet.size === 0) return { removed: 0 }
    let removed = 0
    const entries = []
    const next = inventory.map(inv => {
      const comp = inv.category || inv.company || ''
      if (comp !== targetCompany) return inv
      const list = Array.isArray(inv.imeis) ? [...inv.imeis] : []
      if (!list.length) return inv
      const removedImeis = list.filter(im => rmSet.has(String(im)))
      const kept = list.filter(im => !rmSet.has(String(im)))
      const diff = list.length - kept.length
      if (diff <= 0) return inv
      removed += diff
      // Record entries
      removedImeis.forEach(im => {
        entries.push({
          id: `cr-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          date: (date || new Date().toISOString().slice(0,10)),
          company: targetCompany,
          imei: String(im),
          model: inv.name || 'Mobile',
          invoice: inv.invoice || '',
          // Store purchase price for reporting/printing totals
          price: Number(inv.purchasePrice || 0),
        })
      })
      return { ...inv, imeis: kept, totalItems: Math.max(0, Number(inv.totalItems||0) - diff) }
    })
    set({ inventory: next, companyReturns: [...entries, ...companyReturns] })
    return { removed, company: targetCompany, date: date || new Date().toISOString().slice(0,10) }
  },
  // Customers CRUD
  removeCustomer: (id) => set((state) => ({ customers: state.customers.filter(c => c.id !== id) })),

  // Returns
  returnMobile: (payload) => set((state) => {
    const inventoryId = payload?.inventoryId
    const entry = {
      id: nanoid(),
      inventoryId,
      reason: payload?.reason || '',
      // keep backward-compatible 'date' while also saving 'returnDate'
      date: payload?.returnDate || payload?.date || new Date().toISOString().slice(0,10),
      returnDate: payload?.returnDate || payload?.date || new Date().toISOString().slice(0,10),
      customerName: payload?.customerName || '',
      purchaseDate: payload?.purchaseDate || '',
      refundAmount: Number(payload?.refundAmount || 0),
      product: payload?.product || '',
      billNo: payload?.billNo || '',
    }
    // Restock inventory: increment totalItems and optionally push back IMEI
    const inventory = state.inventory.map(inv => {
      if (inv.id !== inventoryId) return inv
      const next = { ...inv }
      const prevCount = Number(next.totalItems || 0)
      next.totalItems = prevCount + 1
      const im = String(payload?.imei||'').trim()
      if (im) {
        const list = Array.isArray(next.imeis) ? [...next.imeis] : []
        if (!list.includes(im)) list.unshift(im)
        next.imeis = list
      }
      return next
    })
    return {
      returns: [...state.returns, entry],
      inventory,
    }
  }),

  // Repairs
  sendToRepair: ({ mobileId, cost, dateSent }) => set((state) => ({
    repairs: [...state.repairs, { id: nanoid(), mobileId, cost, dateSent, status: 'sent' }],
    mobiles: state.mobiles.map(m => m.id === mobileId ? { ...m, status: 'repair' } : m),
  })),
  receiveFromRepair: ({ repairId, dateReceived, status = 'fixed' }) => set((state) => ({
    repairs: state.repairs.map(r => r.id === repairId ? { ...r, dateReceived, status } : r),
    mobiles: state.mobiles.map(m => {
      const r = state.repairs.find(rr => rr.id === repairId)
      if (!r || m.id !== r.mobileId) return m
      return { ...m, status: status === 'fixed' ? 'in_stock' : 'repair' }
    })
  })),

  // Bills
  addBill: (bill) => set((state) => ({ bills: [...state.bills, bill] })),

  // Expenses
  addExpense: (payload) => set((state) => {
    const entry = {
      id: nanoid(),
      date: payload?.date || new Date().toISOString().slice(0,10),
      category: (payload?.category || 'General').trim(),
      description: (payload?.description || '').trim(),
      amount: Number(payload?.amount || 0),
    }
    if (!entry.amount || entry.amount < 0) return {}
    return { expenses: [entry, ...state.expenses] }
  }),
  removeExpense: (id) => set((state) => ({ expenses: state.expenses.filter(e => e.id !== id) })),

  // Settings
  setSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),
  // Colors CRUD (simple)
  addColor: (name) => set((state) => {
    const n = String(name||'').trim()
    if (!n) return {}
    const exists = (state.colors||[]).some(c => String(c).toLowerCase() === n.toLowerCase())
    if (exists) return {}
    return { colors: [...(state.colors||[]), n] }
  }),

  // Users CRUD
  addUser: ({ username, password, role }) => set((state) => {
    const uname = String(username||'').trim()
    if (!uname || !password) return {}
    if (state.users.some(u => u.username.toLowerCase() === uname.toLowerCase())) return {}
    return { users: [{ id: nanoid(), username: uname, password: String(password), role: role || 'Employee' }, ...state.users] }
  }),
  updateUser: (id, changes) => set((state) => {
    const next = state.users.map(u => u.id === id ? { ...u, ...changes } : u)
    const counts = next.reduce((m,u)=>{ const k=u.username.toLowerCase(); m[k]=(m[k]||0)+1; return m }, {})
    if (Object.values(counts).some(c=>c>1)) return {}
    return { users: next }
  }),
  removeUser: (id) => set((state) => ({ users: state.users.filter(u => u.id !== id) })),

  // Auth
  login: ({ username, password }) => set((state) => {
    const uname = String(username||'').trim().toLowerCase()
    const user = state.users.find(u => u.username.toLowerCase() === uname && String(u.password) === String(password))
    if (!user) return {}
    return { currentUser: { id: user.id, username: user.username, role: user.role } }
  }),
  logout: () => set({ currentUser: null }),

  // UI controls
  toggleSidebar: () => set((state) => ({ ui: { ...state.ui, sidebarOpen: !state.ui?.sidebarOpen } })),
  setSidebarOpen: (open) => set((state) => ({ ui: { ...state.ui, sidebarOpen: !!open } })),
  toggleDarkMode: () => set((state) => ({ ui: { ...state.ui, darkMode: !state.ui?.darkMode } })),
  setDarkMode: (darkMode) => set((state) => ({ ui: { ...state.ui, darkMode: !!darkMode } })),

  // POS actions
  setPosCatalog: (items) => set({ posCatalog: items }),
  addToCart: (itemId) => set((state) => {
    const inv = state.inventory.find(i => i.id === itemId)
    if (!inv) return {}
    const existing = state.posCart.find(ci => ci.id === itemId)
    const stock = Number(inv.totalItems || 0)
    const purchasePrice = Number(inv.purchasePrice || 0)
    const name = inv.name
    const qty = Math.min((existing?.qty || 0) + 1, stock)
    const next = existing
      ? state.posCart.map(ci => ci.id === itemId ? { ...ci, qty } : ci)
      : [...state.posCart, { id: itemId, name, purchasePrice, profit: 0, qty: 1 }]
    return { posCart: next }
  }),
  incrementQty: (itemId) => set((state) => {
    const inv = state.inventory.find(i => i.id === itemId)
    if (!inv) return {}
    const stock = Number(inv.totalItems || 0)
    return { posCart: state.posCart.map(ci => ci.id === itemId ? { ...ci, qty: Math.min(ci.qty + 1, stock) } : ci) }
  }),
  decrementQty: (itemId) => set((state) => ({ posCart: state.posCart.map(ci => ci.id === itemId ? { ...ci, qty: Math.max(ci.qty - 1, 1) } : ci) })),
  removeFromCart: (itemId) => set((state) => ({ posCart: state.posCart.filter(ci => ci.id !== itemId) })),
  clearCart: () => set({ posCart: [] }),
  updateCartProfit: (itemId, profit) => set((state) => ({
    posCart: state.posCart.map(ci => ci.id === itemId ? { ...ci, profit: Number(profit || 0) } : ci)
  })),

  // Inventory actions
  updateInventoryStock: (id, changes) => set((state) => {
    // Find existing item to compare IMEIs and other details
    const prev = state.inventory.find(i => i.id === id)
    // Apply inventory changes
    const inventory = state.inventory.map(it => it.id === id ? { ...it, ...changes } : it)
    const inv = inventory.find(i => i.id === id)
    const stock = Number(inv?.totalItems || 0)
    // Clamp cart quantities for this item
    const posCart = state.posCart.map(ci => ci.id === id ? { ...ci, qty: Math.min(ci.qty, stock) } : ci)

    // Determine newly added IMEIs (delta)
    let purchaseHistory = state.purchaseHistory
    try {
      const prevSet = new Set(Array.isArray(prev?.imeis) ? prev.imeis : [])
      const nextImeis = Array.isArray(changes?.imeis) ? changes.imeis : (Array.isArray(inv?.imeis) ? inv.imeis : [])
      const addedImeis = nextImeis.filter(im => im && !prevSet.has(im))
      const addedCount = addedImeis.length
      if (addedCount > 0) {
        const date = changes?.purchaseDate || new Date().toISOString().slice(0,10)
        const unitPrice = Number(changes?.purchasePrice ?? inv?.purchasePrice ?? 0)
        const invoice = inv?.invoice || `MS-${Date.now()}`
        const type = changes?.type || inv?.type || 'normal'
        const supplier = changes?.supplier ?? inv?.supplier ?? ''
        const receivedFrom = changes?.receivedFrom ?? inv?.receivedFrom ?? ''
        const sellerPhone = changes?.sellerPhone ?? inv?.sellerPhone ?? ''
        const sellerCnic = changes?.sellerCnic ?? inv?.sellerCnic ?? ''
        const medicine = changes?.name ?? inv?.name ?? 'Mobile'
        const unitsPerPack = Number(changes?.unitsPerPack ?? inv?.unitsPerPack ?? 1)

        const entries = addedImeis.map(im => ({
          id: `ph-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          date,
          medicine,
          supplier,
          unitsPerPack,
          totalItems: 1,
          buyPack: unitPrice,
          buyUnit: unitPrice,
          totalAmount: unitPrice * 1,
          invoice,
          type,
          receivedFrom,
          sellerPhone,
          sellerCnic,
          imeis: [im],
        }))
        purchaseHistory = [...entries, ...purchaseHistory]
      }
    } catch {}

    return { inventory, posCart, purchaseHistory }
  }),
  deleteInventoryItem: (id) => set((state) => ({
    inventory: state.inventory.filter(it => it.id !== id),
    posCart: state.posCart.filter(ci => ci.id !== id),
  })),
  addInventoryItem: (item) => set((state) => {
    const id = `inv-${Date.now()}`
    const newInv = { id, status: 'approved', ...item }
    const ph = {
      id: `ph-${Date.now()}`,
      date: new Date().toISOString().slice(0,10),
      medicine: item.name,
      supplier: item.supplier || '',
      unitsPerPack: Number(item.unitsPerPack || 1),
      totalItems: Number(item.totalItems || (Number(item.packs||1) * Number(item.unitsPerPack||1))),
      buyPack: Number(item.purchasePrice || 0),
      buyUnit: Number(item.purchasePrice || 0),
      // Total stock value should be unit purchase price * total items
      totalAmount: Number(item.purchasePrice || 0) * Number(item.totalItems || (Number(item.packs||1) * Number(item.unitsPerPack||1))),
      invoice: item.invoice,
      type: item.type || 'normal',
      receivedFrom: item.receivedFrom || '',
      sellerPhone: item.sellerPhone || '',
      sellerCnic: item.sellerCnic || '',
      imeis: Array.isArray(item.imeis) ? [...item.imeis] : [],
    }
    return {
      inventory: [newInv, ...state.inventory],
      purchaseHistory: [ph, ...state.purchaseHistory]
    }
  }),

  // Suppliers CRUD
  addSupplier: (payload) => set((state) => ({ suppliers: [{ id: nanoid(), name: payload.name, phone: payload.phone || '', cnic: payload.cnic || '', address: payload.address || '' }, ...state.suppliers] })),
  removeSupplier: (id) => set((state) => ({ suppliers: state.suppliers.filter(s => s.id !== id) })),
  updateSupplier: (id, changes) => set((state) => ({ suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...changes } : s) })),

  // Checkout
  processCheckout: ({ cart, customer, billTotal, billDiscount = 0, tax = 0 }) => set((state) => {
    const dateIso = new Date().toISOString()
    const billNo = `B-${dateIso.slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-3)}`
    // Assign IMEIs to cart items (use provided or take from inventory)
    const inventory = state.inventory.map(it => ({ ...it }))
    const itemsWithImeis = cart.map(ci => {
      const inv = inventory.find(i => i.id === ci.id)
      const qty = Number(ci.qty || 0)
      let useImeis = Array.isArray(ci.imeis) ? [...ci.imeis] : []
      if (useImeis.length < qty) {
        const avail = Array.isArray(inv?.imeis) ? inv.imeis : []
        useImeis = avail.slice(0, qty)
      }
      // Update inventory: remove assigned IMEIs and decrement stock
      if (inv) {
        const prevImeis = Array.isArray(inv.imeis) ? inv.imeis : []
        const removeCount = Math.min(qty, prevImeis.length)
        inv.imeis = prevImeis.slice(removeCount)
        inv.totalItems = Math.max(Number(inv.totalItems || 0) - qty, 0)
      }
      return { id: ci.id, name: ci.name, qty, price: ci.price, imeis: useImeis }
    })
    const sale = {
      id: nanoid(),
      date: dateIso.slice(0,10),
      billNo,
      customer: { name: customer?.name || 'Walk-in', phone: customer?.phone || '' },
      items: itemsWithImeis,
      subtotal: cart.reduce((a,b)=>a + b.price*b.qty, 0),
      discount: billDiscount,
      tax,
      total: billTotal,
    }
    const phoneKey = (customer?.phone || '').trim()
    let customers
    const entry = { type: 'purchase', date: dateIso, billNo, total: billTotal, items: sale.items }
    const idx = state.customers.findIndex(c => (c.phone || '').trim() === phoneKey && phoneKey)
    if (idx >= 0) {
      customers = state.customers.map((c,i) => i===idx ? { ...c, name: customer?.name || c.name, history: [...(c.history||[]), entry] } : c)
    } else {
      customers = [...state.customers, { id: nanoid(), name: customer?.name || 'Walk-in', phone: phoneKey, history: [entry] }]
    }
    return { inventory, sales: [...state.sales, sale], customers, posCart: [] }
  }),

  // Reset all state and clear persisted storage (soft reset, no hard reload)
  resetAll: () => {
    try { localStorage.removeItem('mobile-shop-state') } catch {}
    set(() => ({ ...initialState }))
  },

  // Retailer/Wholesale Sales
  addRetailerSale: (payload) => set((state) => {
    const sale = {
      id: nanoid(),
      retailerName: payload.retailerName,
      shopName: payload.shopName || '',
      phone: payload.phone,
      items: payload.items,
      total: Number(payload.total || 0),
      date: payload.date || new Date().toISOString().slice(0,10),
      notes: payload.notes || '',
      status: 'pending',
    }
    // Deduct from inventory
    const inventory = state.inventory.map(inv => {
      const saleItem = payload.items.find(it => it.inventoryId === inv.id)
      if (!saleItem) return inv
      const qty = Number(saleItem.qty || 0)
      const prevImeis = Array.isArray(inv.imeis) ? inv.imeis : []
      const removeCount = Math.min(qty, prevImeis.length)
      return {
        ...inv,
        imeis: prevImeis.slice(removeCount),
        totalItems: Math.max(Number(inv.totalItems || 0) - qty, 0)
      }
    })
    return {
      retailerSales: [...state.retailerSales, sale],
      inventory,
    }
  }),

  markRetailerPaid: (id) => set((state) => {
    const retailerSales = state.retailerSales.map(s => 
      s.id === id ? { ...s, status: 'paid', paidDate: new Date().toISOString().slice(0,10) } : s
    )
    // Add to regular sales when marked as paid
    const retailerSale = state.retailerSales.find(s => s.id === id)
    if (!retailerSale) return { retailerSales }
    
    const sale = {
      id: nanoid(),
      date: retailerSale.paidDate || new Date().toISOString().slice(0,10),
      billNo: `R-${retailerSale.id.slice(-6)}`,
      customer: { name: retailerSale.retailerName, phone: retailerSale.phone },
      items: retailerSale.items.map(it => {
        const inv = state.inventory.find(i => i.id === it.inventoryId)
        return {
          id: it.inventoryId,
          name: inv?.name || 'Mobile',
          qty: Number(it.qty || 0),
          price: Number(it.price || 0),
          imeis: []
        }
      }),
      subtotal: Number(retailerSale.total),
      discount: 0,
      tax: 0,
      total: Number(retailerSale.total),
    }
    return {
      retailerSales,
      sales: [...state.sales, sale],
    }
  }),

  returnRetailerSale: (id) => set((state) => {
    const retailerSale = state.retailerSales.find(s => s.id === id)
    if (!retailerSale) return {}
    
    // Return items to inventory
    const inventory = state.inventory.map(inv => {
      const saleItem = retailerSale.items.find(it => it.inventoryId === inv.id)
      if (!saleItem) return inv
      const qty = Number(saleItem.qty || 0)
      return {
        ...inv,
        totalItems: Number(inv.totalItems || 0) + qty
      }
    })
    
    const retailerSales = state.retailerSales.map(s =>
      s.id === id ? { ...s, status: 'returned', returnDate: new Date().toISOString().slice(0,10) } : s
    )
    
    return { retailerSales, inventory }
  }),

  // Cloud Sync Status Action
  setCloudSyncStatus: (cloudSyncStatus, lastSyncTime) => set((state) => ({ 
    cloudSyncStatus, 
    lastSyncTime: lastSyncTime !== undefined ? lastSyncTime : state.lastSyncTime 
  })),

}), {
  name: 'mobile-shop-state',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => {
    const { currentUser, cloudSyncStatus, lastSyncTime, ...rest } = state
    return rest
  },
}))

export default useStore

// helpers
function upsertCustomer(customers, sale) {
  const { customer, price, date, mobileId } = sale
  const idx = customers.findIndex(c => c.cnic === customer.cnic)
  if (idx >= 0) {
    const existing = customers[idx]
    const updated = { ...existing, history: [...(existing.history||[]), { type: 'sale', date, price, mobileId, customer }] }
    return customers.map((c, i) => i === idx ? updated : c)
  }
  return [
    ...customers,
    { id: nanoid(), ...customer, history: [{ type: 'sale', date, price, mobileId, customer }] }
  ]
}
