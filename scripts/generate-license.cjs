// Generate a production-style license key matching electron/license.js validation
// Usage:
//   node scripts/generate-license.cjs ABCD1234EFGH5678
// Output:
//   ABCD1234EFGH5678 + 12-char HMAC suffix
const crypto = require('node:crypto');

const SECRET = 'msm_local_secret_v1' // MUST match electron/license.js SECRET

function hmac12(input) {
  return crypto.createHmac('sha256', SECRET).update(input).digest('hex').slice(0, 12).toUpperCase()
}

const body = (process.argv[2] || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
if (!body || body.length < 16) {
  console.error('Provide a base key body (>=16 alphanumerics), e.g. ABCD1234EFGH5678')
  process.exit(1)
}

const sig = hmac12(body)
const key = body + sig

// Pretty print in groups of 4
const pretty = key.replace(/(.{4})/g, '$1-').replace(/-$/,'')
console.log(pretty)
