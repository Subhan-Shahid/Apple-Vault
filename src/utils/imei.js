// Utilities for IMEI handling

// Strip non-digits and trim
export function normalizeIMEI(v = '') {
  return String(v).replace(/[^0-9]/g, '').slice(0, 17)
}

// Basic length check (14-17 common; 15 typical)
export function isCompleteIMEI(v = '') {
  const d = normalizeIMEI(v)
  return d.length >= 14 && d.length <= 17
}

// Luhn check for IMEI (optional, can be toggled via param)
export function isValidIMEILuhn(imei) {
  const s = normalizeIMEI(imei)
  if (s.length < 15) return false
  let sum = 0
  for (let i = 0; i < s.length; i++) {
    let n = parseInt(s[s.length - 1 - i], 10)
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}
