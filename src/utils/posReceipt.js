// Utility to build a POS-style thermal receipt HTML (80mm)
// Usage: import { buildThermalReceiptHtml } from '../utils/posReceipt'
// Pass computed items and totals to ensure consistency across pages.

/**
 * @typedef {Object} ReceiptItem
 * @property {string} name
 * @property {number} qty
 * @property {number} price // unit price
 * @property {string[]=} imeis
 */

/**
 * @param {Object} params
 * @param {{ name?: string, phone?: string, address?: string, logoDataUrl?: string }} params.company
 * @param {string} params.customerName
 * @param {string} params.billNo
 * @param {string} params.dateTime // display string
 * @param {ReceiptItem[]} params.items
 * @param {number} params.subtotal
 * @param {number} [params.discount]
 * @param {number} [params.tax]
 * @param {number} [params.taxRate] // 0..1
 * @param {number} params.total
 * @param {boolean} [params.printTaxOnReceipt]
 * @returns {string}
 */
export function buildThermalReceiptHtml(params) {
  const {
    company = {},
    customerName = 'Walk-in',
    billNo = '-',
    dateTime = '',
    items = [],
    subtotal = 0,
    discount = 0,
    tax = 0,
    taxRate = 0,
    total = 0,
    printTaxOnReceipt = true,
  } = params || {}

  // Build line items: amount column may optionally include tax share when printTaxOnReceipt is false
  const taxedBase = Math.max(subtotal - Number(discount || 0), 0)
  const rowsHtml = items.map((ci) => {
    const base = Number(ci.price || 0) * Number(ci.qty || 0)
    let amountDisplay = base
    if ((Number(taxRate) > 0) && !printTaxOnReceipt) {
      const baseAdj = subtotal > 0 ? (base - (Number(discount || 0) * (base / subtotal))) : base
      const taxShare = taxedBase > 0 ? (Number(tax || 0) * (baseAdj / taxedBase)) : 0
      amountDisplay = base + taxShare
    }
    const imeiLine = Array.isArray(ci.imeis) && ci.imeis.length
      ? `<tr class="meta"><td colspan="2">IMEI: ${ci.imeis.join(', ')}</td></tr>`
      : ''
    return `
      <tr>
        <td class="col-item">${escapeHtml(ci.name || 'Item')}</td>
        <td class="col-qty">${Number(ci.qty || 0)}</td>
        <td class="col-amt">${amountDisplay.toFixed(2)}</td>
      </tr>
      <tr class="meta"><td colspan="2">${Number(ci.qty || 0)} x ${(Number(ci.price || 0)).toFixed(2)}</td></tr>
      ${imeiLine}
    `
  }).join('')

  const displaySubtotal = (Number(taxRate) > 0 && !printTaxOnReceipt) ? (Number(subtotal) + Number(tax)) : Number(subtotal)

  const logoHtml = company.logoDataUrl
    ? `<img src="${company.logoDataUrl}" style="height:40px;object-fit:contain" alt="logo" />`
    : makeFallbackLogo(company.name || 'MobileShop')

  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>
    <style>
      @page { size: 80mm auto; margin: 0 }
      * { box-sizing: border-box }
      body { margin: 0; padding: 0; background: #fff; color:#000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .wrap { width: 80mm; max-width: 80mm; margin: 0 auto; padding: 10px 10px 12px; font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 12px; line-height: 1.3 }
      .center { text-align: center }
      .muted { color: #111; font-size: 12px }
      .bold { font-weight: 700 }
      .title { font-size: 20px; letter-spacing: .5px }
      .dash { border-top: 2px dotted #000; margin: 6px 0 }
      .subdash { border-top: 1px dotted #000; margin: 6px 0 }
      table { width: 100%; border-collapse: collapse }
      th, td { padding: 4px 0 }
      th { font-weight: 700; text-align: left }
      .cols th { border-bottom: 1px dotted #000 }
      .col-item { width: 60%; text-transform: capitalize }
      .col-qty { width: 15%; text-align: center }
      .col-amt { width: 25%; text-align: right }
      .totals td { padding: 3px 0 }
      .totals .label { text-align: left }
      .totals .value { text-align: right }
      .total-row td { font-weight: 700; font-size: 13px }
      .thank { text-align: center; margin-top: 8px; font-weight: 600 }
      tr.meta td { color: #111; font-size: 11px }
      .footer { margin-top: 12px; padding-top: 8px; border-top: 1px dotted #000; font-size: 13px; text-align: center; line-height: 1.6; direction: rtl; letter-spacing: 0.5px; font-weight: 700; }
      @media print { .wrap { padding: 6mm 6mm 8mm } }
    </style>
  </head><body>
    <div class="wrap">
      <div class="center">
        <div style="margin-bottom:6px">${logoHtml}</div>
        <div class="title bold">${escapeHtml((company.name || 'MobileShop').toUpperCase())}</div>
        ${company.address ? `<div class="muted">${escapeHtml(company.address)}</div>` : ''}
        ${company.phone ? `<div class="muted">PHONE : ${escapeHtml(company.phone)}</div>` : ''}
      </div>
      <div class="dash"></div>
      <div class="center bold">Retail Invoice</div>
      <div class="subdash"></div>
      <div>
        <div class="muted">Date : ${escapeHtml(dateTime || '')}</div>
        <div class="muted">${escapeHtml(customerName || 'Walk-in')}</div>
        <div class="muted">Bill No: ${escapeHtml(billNo || '-')}</div>
        <div class="muted">Payment Mode: cash</div>
      </div>
      <div class="subdash"></div>
      <table class="cols">
        <thead>
          <tr>
            <th class="col-item">Item</th>
            <th class="col-qty">Qty</th>
            <th class="col-amt">Amt</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="subdash"></div>
      <table class="totals">
        <tr><td class="label bold">Sub Total</td><td class="value bold">${displaySubtotal.toFixed(2)}</td></tr>
        ${Number(discount||0) ? `<tr><td class="label">(-) Discount</td><td class="value">${Number(discount).toFixed(2)}</td></tr>` : ''}
        ${(Number(taxRate) > 0) ? `<tr><td class="label">GST (${(Number(taxRate||0)*100).toFixed(2)}%)</td><td class="value">${Number(tax||0).toFixed(2)}</td></tr>` : ''}
        <tr class="total-row"><td class="label">TOTAL</td><td class="value">Rs ${Number(total||0).toFixed(2)}</td></tr>
      </table>
      <div class="subdash"></div>
      <div class="thank">Thank you for your purchase!</div>
      <div class="footer">
        <div>وارنٹی والے سیٹ کی کمپنی ذمہ دار ہے</div>
        <div>وارنٹی کلیم کی صورت میں کسٹمر خود کمپنی کے پاس جائے گا اور دکاندار ذمہ دار نہیں ہوگا</div>
      </div>
    </div>
  </body></html>`
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Build a simple fallback SVG logo with company initials so a logo always appears
function makeFallbackLogo(name) {
  const text = String(name || 'MS').trim()
  const initials = text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || 'MS'
  const bg = '#111827' // slate-900
  const fg = '#ffffff'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40" role="img" aria-label="${escapeHtml(text)}">
      <rect rx="6" ry="6" width="120" height="40" fill="${bg}" />
      <text x="60" y="26" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${fg}">${escapeHtml(initials)}</text>
    </svg>`
  )
}
