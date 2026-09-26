// Start Vite and, once ready, launch Electron without extra npm deps
// Works on Windows without installing start-server-and-test
const { spawn } = require('node:child_process');
const http = require('node:http');

const VITE_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

function waitForServer(url, timeoutMs = 60000, intervalMs = 500) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume() // drain
        resolve()
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`))
        } else {
          setTimeout(tryOnce, intervalMs)
        }
      })
    }
    tryOnce()
  })
}

function run(command, args, options = {}) {
  return spawn(command, args, { stdio: 'inherit', shell: true, ...options })
}

async function main() {
  // 1) start Vite (via script so it matches project config)
  const vite = run('npm', ['run', 'dev:web'])

  const onExit = () => {
    if (vite && !vite.killed) vite.kill()
    process.exit()
  }
  process.on('SIGINT', onExit)
  process.on('SIGTERM', onExit)
  process.on('exit', onExit)

  // 2) wait for dev server
  try {
    await waitForServer(VITE_URL)
  } catch (e) {
    console.error(String(e))
    process.exit(1)
  }

  // 3) launch Electron pointing to Vite URL
  const env = { ...process.env, ELECTRON_START_URL: VITE_URL }
  const electron = run('electron', ['.'], { env })
  electron.on('exit', (code) => {
    onExit()
    process.exit(code ?? 0)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
