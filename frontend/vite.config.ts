import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'

/**
 * The Tide enclave loads a relay page at /tide_dpop/iss/<hex>/aud/<hex>/... during login. It parses
 * iss/aud out of its own URL path, so every path under /tide_dpop/ must serve the same static file,
 * with the CSP the enclave expects. Without this, login fails with TIDE-SWE-UNHANDLED.
 */
function tideDpopRelay(): Plugin {
  const relay: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.startsWith('/tide_dpop/')) {
      req.url = '/tide_dpop_auth.html'
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'")
      res.setHeader('Allow-CSP-From', '*')
    }
    next()
  }
  return {
    name: 'tide-dpop-relay',
    configureServer: (server) => void server.middlewares.use(relay),
    configurePreviewServer: (server) => void server.middlewares.use(relay),
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), tideDpopRelay()],
  server: {
    proxy: {
      '/api': {
        // API_URL (frontend/.env.local) points the dev proxy at another API port.
        target: loadEnv(mode, process.cwd(), '').API_URL || 'http://localhost:4000',
        // Keep the browser's Host. A DPoP proof is signed for the URL the browser used
        // (localhost:5173); the string shorthand rewrites Host to the API and every proof then fails the htu check.
        changeOrigin: false,
      },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
}))
