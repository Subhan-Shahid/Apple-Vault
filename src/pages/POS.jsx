import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGrid, List, EyeOff, ScanLine, Trash2, Plus, Minus, ShoppingCart, MoreHorizontal, ChevronDown } from 'lucide-react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { buildThermalReceiptHtml } from '../utils/posReceipt'

export default function POS() {
  const { inventory, posCart, addToCart, incrementQty, decrementQty, removeFromCart, clearCart, processCheckout, settings, updateCartProfit } = useStore()
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid') // 'grid' | 'list'
  // Track ids of items hidden by the user. When non-empty, the button shows 'Unhide'.
  const [hiddenIds, setHiddenIds] = useState([])
  const [discount, setDiscount] = useState(0)
  const [payOpen, setPayOpen] = useState(false)
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [extraDiscount, setExtraDiscount] = useState('')
  const [stockAlertOpen, setStockAlertOpen] = useState(false)
  const [stockAlertText, setStockAlertText] = useState('')
  const inputRef = useRef(null)
  // In-app receipt preview/print
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptHtml, setReceiptHtml] = useState('')
  const receiptFrameRef = useRef(null)
  // Whether to print tax line on receipt (only relevant when tax > 0)
  const [printTaxOnReceipt, setPrintTaxOnReceipt] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mobileTab, setMobileTab] = useState('products') // 'products' | 'cart'

  // Focus search on mount so scanners type directly here
  useEffect(() => { inputRef.current?.focus() }, [])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const norm = (s) => String(s||'').toLowerCase().replace(/[^a-z0-9]/g, '')
    const qn = norm(q)
    const catalog = (inventory || []).map(it => ({ id: it.id, name: it.name, price: it.purchasePrice, stock: it.totalItems, imeis: it.imeis || [], barcode: it.barcode || '', invoice: it.invoice || '' }))
    // Only match by NAME for listing results
    let filtered = catalog.filter(i => {
      if (!q) return true
      const name = String(i.name || '').toLowerCase()
      return name.includes(q)
    })
    // If 'Hide Inventory' is enabled, only hide items when there's no active search query.
    // When user is searching (q has text), always show matching items even if hiddenIds contains them.
    if (hiddenIds.length && !q) {
      const set = new Set(hiddenIds)
      filtered = filtered.filter(i => !set.has(i.id))
    }
    return filtered
  }, [inventory, query, hiddenIds])

  // Auto-add when scanner types and we get a unique or exact match
  useEffect(() => {
    const q = query.trim().toLowerCase()
    const norm = (s) => String(s||'').toLowerCase().replace(/[^a-z0-9]/g, '')
    const qn = norm(q)
    if (!q) return
    // Build full catalog (ignore hidden filter) for exact match
    const fullCatalog = (inventory || []).map(it => ({ id: it.id, name: it.name, price: it.purchasePrice, stock: it.totalItems, imeis: it.imeis || [], barcode: it.barcode || '', invoice: it.invoice || '' }))
    // First: exact match by ID / barcode / invoice / IMEI
    const exact = fullCatalog.find(i => {
      const id = i.id.toLowerCase()
      const barcode = (i.barcode||'').toLowerCase()
      const invoice = (i.invoice||'').toLowerCase()
      const imeiExact = (i.imeis||[]).some(im => String(im).toLowerCase() === q)
      const idN = norm(id), bcN = norm(barcode), invN = norm(invoice)
      const imeiN = (i.imeis||[]).some(im => norm(im) === qn)
      return id === q || barcode === q || invoice === q || imeiExact || idN === qn || bcN === qn || invN === qn || imeiN
    })
    if (exact && exact.stock > 0) {
      addToCart(exact.id)
      setQuery('')
      return
    }
    // Second: single filtered result
    if (items.length === 1 && items[0].stock > 0) {
      addToCart(items[0].id)
      setQuery('')
    }
  }, [query, items, addToCart])

  const totals = useMemo(() => {
    const subtotal = posCart.reduce((a, b) => {
      const purchasePrice = Number(b.purchasePrice || 0)
      const profit = Number(b.profit || 0)
      const salePrice = purchasePrice + profit
      return a + salePrice * b.qty
    }, 0)
    const disc = Number(discount || 0)
    const taxable = Math.max(subtotal - disc, 0)
    const rate = Number((settings?.salesTaxPercent || 0)) / 100
    const tax = Number((taxable * rate).toFixed(2))
    const total = Number((taxable + tax).toFixed(2))
    return { subtotal, discount: disc, tax, total, rate }
  }, [posCart, discount, settings?.salesTaxPercent])

  // Toolbar actions
  const onScan = () => {
    // Focus the input so barcode scanners (keyboard wedge) type into it
    inputRef.current?.focus()
  }

  const tryAutoAdd = () => {
    // If exactly one item matches, add it
    if (items.length === 1) {
      const only = items[0]
      if (only.stock > 0) {
        addToCart(only.id)
        setQuery('')
      }
      return
    }
    // If there is an exact ID/IMEI match among filtered, pick that
    const q = query.trim().toLowerCase()
    if (!q) return
    const exact = items.find(i => i.id.toLowerCase() === q || (i.imeis||[]).some(im=>String(im).toLowerCase()===q))
    if (exact && exact.stock > 0) {
      addToCart(exact.id)
      setQuery('')
    }
  }
  const onToggleHide = () => {
    if (hiddenIds.length === 0) {
      // Hide currently visible items
      setHiddenIds(items.map(i => i.id))
    } else {
      // Unhide all
      setHiddenIds([])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-semibold">Point of Sale (POS)</h1>
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar w-full sm:w-auto">
          <button className={`btn-secondary shrink-0 ${view==='grid' ? 'ring-2 ring-brand/40' : ''}`} onClick={()=>setView('grid')}>
            <LayoutGrid size={16} /> Grid
          </button>
          <button className={`btn-secondary shrink-0 ${view==='list' ? 'ring-2 ring-brand/40' : ''}`} onClick={()=>setView('list')}>
            <List size={16} /> List
          </button>
          <button className="btn-secondary shrink-0" onClick={onScan}>
            <ScanLine size={16} /> Scan
          </button>
          <button className="btn-secondary shrink-0" onClick={clearCart}>
            <Trash2 size={16} /> Clear
          </button>
          <button 
            className="btn-secondary shrink-0 relative" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <MoreHorizontal size={16} /> More
            {showAdvanced && <ChevronDown size={14} className="ml-1" />}
          </button>
          
          {showAdvanced && (
            <div className="flex items-center gap-2 ml-2 border-l-2 border-gray-100 pl-2">
              <button className="btn-secondary shrink-0" onClick={onToggleHide}>
                <EyeOff size={16} /> {hiddenIds.length ? 'Unhide' : 'Hide'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setMobileTab('products')}
          className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
            mobileTab === 'products'
              ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Products ({items.length})
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ShoppingCart size={15} />
          Cart ({posCart.length})
          {posCart.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-brand"></span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Catalog */}
        <div className={`${mobileTab === 'products' ? 'block' : 'hidden lg:block'} lg:col-span-2 space-y-4`}>
          <Card>
            <div>
              <input
                className="input w-full"
                placeholder="Search mobile name or scan IMEI..."
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
                ref={inputRef}
                onKeyDown={(e)=>{
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    tryAutoAdd()
                  }
                }}
              />
            </div>
          </Card>

          {/* Product list */}
          <div className="grid gap-3">
            {view === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map(item => (
                  <div key={item.id} className="card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium capitalize text-sm sm:text-base">{item.name}</div>
                      <div className="text-brand font-semibold text-sm sm:text-base">PKR {Number(item.price).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Stock: {item.stock}</span>
                      <button
                        className={`btn-primary text-sm ${item.stock <= 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          if (item.stock <= 0) { setStockAlertText(`⚠️ This item is out of stock!`); setStockAlertOpen(true); return }
                          const existing = posCart.find(ci => ci.id === item.id)
                          if (existing && existing.qty >= item.stock) { setStockAlertText(`⚠️ '${item.name}' has only ${item.stock} in stock.`); setStockAlertOpen(true); return }
                          addToCart(item.id)
                        }}
                        disabled={item.stock <= 0}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-sm text-gray-500">No items found.</div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="card p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium capitalize text-sm sm:text-base">{item.name}</div>
                        <div className="text-brand font-semibold text-sm sm:text-base">PKR {Number(item.price).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Stock: {item.stock}</span>
                        <button
                          className={`btn-primary text-sm ${item.stock <= 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (item.stock <= 0) { setStockAlertText(`⚠️ This item is out of stock!`); setStockAlertOpen(true); return }
                            const existing = posCart.find(ci => ci.id === item.id)
                            if (existing && existing.qty >= item.stock) { setStockAlertText(`⚠️ '${item.name}' has only ${item.stock} in stock.`); setStockAlertOpen(true); return }
                            addToCart(item.id)
                          }}
                          disabled={item.stock <= 0}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-sm text-gray-500">No items found.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className={`${mobileTab === 'cart' ? 'block' : 'hidden lg:block'} space-y-4`}>
          <Card title={`Cart (${posCart.length})`}>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {posCart.map(ci => {
                const purchasePrice = Number(ci.purchasePrice || 0)
                const profit = Number(ci.profit || 0)
                const salePrice = purchasePrice + profit
                return (
                  <div key={ci.id} className="border rounded-lg p-2 sm:p-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                      <div className="flex-1">
                        <div className="font-medium capitalize text-sm">{ci.name}</div>
                        <div className="text-xs text-gray-600">Purchase: PKR {purchasePrice.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button className="btn-secondary px-2 py-1" onClick={()=>decrementQty(ci.id)}><Minus size={12} /></button>
                        <span className="w-6 sm:w-8 text-center font-medium text-sm">{ci.qty}</span>
                        <button className="btn-secondary px-2 py-1" onClick={()=>{
                          const inv = inventory.find(i => i.id === ci.id)
                          const st = Number(inv?.totalItems || 0)
                          if (ci.qty >= st) { setStockAlertText(`⚠️ '${ci.name}' is out of stock for more units.`); setStockAlertOpen(true); return }
                          incrementQty(ci.id)
                        }}><Plus size={12} /></button>
                        <button className="btn-secondary px-2 py-1" onClick={()=>removeFromCart(ci.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => updateCartProfit(ci.id, profit + 100)}
                        >
                          +PKR 100
                        </button>
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => updateCartProfit(ci.id, Math.max(0, profit - 100))}
                        >
                          -PKR 100
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-green-600">Sale: PKR {salePrice.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {posCart.length === 0 && (
                <div className="text-sm text-gray-500">Your cart is empty.</div>
              )}
            </div>
          </Card>

          <Card title="Bill Summary">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span>Subtotal:</span>
                <span>PKR {totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1 gap-2">
                <span>Discount:</span>
                <input type="number" className="input w-24 sm:w-32" value={discount} onChange={e=>setDiscount(e.target.value)} />
              </div>
              {totals.rate > 0 && (
                <div className="flex justify-between py-1">
                  <span>Sales Tax ({Math.round((settings?.salesTaxPercent||0)*100)/100}%):</span>
                  <span>PKR {totals.tax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t mt-2 text-base font-semibold">
                <span>Total:</span>
                <span className="text-gray-900">PKR {totals.total.toLocaleString()}</span>
              </div>
              <button className="btn-primary w-full text-sm" onClick={()=>setPayOpen(true)}>
                <ShoppingCart size={14} /> Process Payment
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Floating mobile bottom checkout pill */}
      {mobileTab === 'products' && posCart.length > 0 && (
        <div className="fixed bottom-4 inset-x-3 z-30 lg:hidden animate-slide-up">
          <button 
            onClick={() => setMobileTab('cart')}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-3 px-4 rounded-xl shadow-xl flex items-center justify-between active:scale-95 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {posCart.reduce((a, b) => a + Number(b.qty || 1), 0)}
              </span>
              <span className="text-sm font-medium">Items in Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">PKR {totals.total.toLocaleString()}</span>
              <span className="text-xs bg-white text-brand px-2.5 py-1 rounded-lg font-bold shadow-xs">
                View Cart &rarr;
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        open={payOpen}
        onClose={()=>setPayOpen(false)}
        title="Process Payment"
        footer={(
          <>
            <button className="btn-secondary" onClick={()=>setPayOpen(false)}>Close</button>
            <button className="btn-primary" onClick={()=>{
              // Build receipt HTML (thermal layout) and show preview with Print/OK buttons
              const now = new Date()
              const fmt = now.toLocaleString()
              const dateIso = now.toISOString()
              const genBillNo = `B-${dateIso.slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-3)}`
              const subtotal = posCart.reduce((a,b)=>{
                const purchasePrice = Number(b.purchasePrice || 0)
                const profit = Number(b.profit || 0)
                const salePrice = purchasePrice + profit
                return a + salePrice * b.qty
              }, 0)
              const billDisc = Number(discount||0) + Number(extraDiscount||0)
              const taxedBase = Math.max(subtotal - billDisc, 0)
              const taxRate = Number(settings?.salesTaxPercent || 0) / 100
              const tax = Number((taxedBase * taxRate).toFixed(2))
              const grand = Number((taxedBase + tax).toFixed(2))
              // Assign IMEIs to each cart item from current inventory snapshot (without mutating store)
              const invIndex = Object.fromEntries((inventory||[]).map(i => [i.id, { ...i, imeis: Array.isArray(i.imeis)? [...i.imeis] : [] }]))
              const cartWithImeis = posCart.map(ci => {
                const inv = invIndex[ci.id]
                const qty = Number(ci.qty||0)
                let assigned = []
                if (inv && Array.isArray(inv.imeis) && inv.imeis.length) {
                  assigned = inv.imeis.slice(0, qty)
                  inv.imeis = inv.imeis.slice(qty)
                }
                const purchasePrice = Number(ci.purchasePrice || 0)
                const profit = Number(ci.profit || 0)
                const salePrice = purchasePrice + profit
                return { ...ci, imeis: assigned, price: salePrice }
              })
              // Persist sale and deduct stock using our assigned IMEIs
              processCheckout({
                cart: cartWithImeis,
                customer: { name: custName, phone: custPhone },
                billTotal: grand,
                billDiscount: billDisc,
                tax,
              })
              const items = cartWithImeis.map(ci => ({ name: ci.name, qty: Number(ci.qty||0), price: Number(ci.price||0), imeis: ci.imeis }))
              const company = { name: settings?.companyName || 'MobileShop', phone: settings?.phone || '', address: settings?.address || '', logoDataUrl: settings?.logoDataUrl || '' }
              const html = buildThermalReceiptHtml({
                company,
                customerName: custName || 'Walk-in',
                billNo: genBillNo,
                dateTime: fmt,
                items,
                subtotal,
                discount: billDisc,
                tax,
                taxRate,
                total: grand,
                printTaxOnReceipt,
              })
              setReceiptHtml(html)
              setReceiptOpen(true)
              // clear and close
              setPayOpen(false)
              setCustName(''); setCustPhone(''); setExtraDiscount('')
              clearCart()
            }}>Process Payment</button>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="label">Customer Name (optional)</label>
            <input className="input" value={custName} onChange={e=>setCustName(e.target.value)} placeholder="Customer name" />
          </div>
          <div>
            <label className="label">Phone Number (optional)</label>
            <input className="input" value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
          </div>
          <div>
            <label className="label">Additional Discount (optional)</label>
            <input type="number" className="input" value={extraDiscount} onChange={e=>setExtraDiscount(e.target.value)} placeholder="e.g., 500" />
          </div>
          {totals.rate > 0 && (
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="printTax" 
                checked={printTaxOnReceipt} 
                onChange={()=>setPrintTaxOnReceipt(!printTaxOnReceipt)} 
                className="w-4 h-4"
              />
              <label htmlFor="printTax" className="text-sm text-gray-700">Show tax on receipt</label>
            </div>
          )}
        </div>
      </Modal>

      {/* Out of Stock Alert */}
      <Modal
        open={stockAlertOpen}
        onClose={()=>setStockAlertOpen(false)}
        title="Out of Stock"
        footer={(
          <button className="btn-primary" onClick={()=>setStockAlertOpen(false)}>Okay</button>
        )}
      >
        <div className="text-sm text-gray-700">{stockAlertText || '⚠️ This item is out of stock!'}</div>
      </Modal>

      {/* Receipt Preview/Print (in-app) */}
      <Modal
        open={receiptOpen}
        onClose={()=>setReceiptOpen(false)}
        title="Receipt"
        footer={(
          <>
            <button
              className="btn-primary"
              onClick={() => {
                try { receiptFrameRef.current?.contentWindow?.focus() } catch(e){}
                try { receiptFrameRef.current?.contentWindow?.print() } catch(e){}
                // Close the receipt preview right after invoking the system print dialog
                setReceiptOpen(false)
              }}
            >Print</button>
            <button className="btn-secondary" onClick={()=>setReceiptOpen(false)}>OK</button>
          </>
        )}
      >
        <div className="h-[70vh]">
          <iframe
            ref={receiptFrameRef}
            title="Receipt"
            className="w-full h-full border rounded"
            srcDoc={receiptHtml}
          />
        </div>
      </Modal>
    </div>
  )
}
