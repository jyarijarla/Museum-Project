/**
 * miniRouter.js — minimal HTTP framework built on Node's built-in `http` module.
 * Replaces Express + cors. Supports:
 *   createRouter()  → router with .get() / .post() / .put() / .delete()
 *   createApp()     → app with .use(prefix, router) / .listen(port, cb)
 *
 * res helpers added at request time:
 *   res.json(obj)           — send JSON, sets Content-Type
 *   res.status(code)        — set status code, returns res (chainable)
 *   res.send(text)          — send plain text
 *
 * req extras added at request time:
 *   req.params   — URL path params  (/visitor/:id  →  req.params.id)
 *   req.query    — parsed query string
 *   req.body     — parsed JSON body
 */

import { createServer } from 'http'
import { URL } from 'url'

// ── path → regex ─────────────────────────────────────────────────────────────

function compilePath(path) {
  const paramNames = []
  const regexStr = path
    .split('/')
    .map(seg => {
      if (seg.startsWith(':')) {
        paramNames.push(seg.slice(1))
        return '([^/]+)'
      }
      // escape any regex-special chars in literal segments
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return { regex: new RegExp(`^${regexStr}$`), paramNames }
}

// ── augment raw ServerResponse with Express-style helpers ────────────────────

function wrapRes(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (obj) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json')
    }
    res.end(JSON.stringify(obj))
  }
  res.send = (text) => {
    res.end(String(text ?? ''))
  }
}

// ── parse JSON request body ───────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve) => {
    const ct = req.headers['content-type'] || ''
    if (!ct.includes('application/json')) { resolve({}); return }
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

// ── Router ────────────────────────────────────────────────────────────────────

export function createRouter() {
  const routes = []

  function addRoute(method, path, handler) {
    routes.push({ method: method.toUpperCase(), ...compilePath(path), handler })
  }

  return {
    get:    (path, handler) => addRoute('GET',    path, handler),
    post:   (path, handler) => addRoute('POST',   path, handler),
    put:    (path, handler) => addRoute('PUT',    path, handler),
    delete: (path, handler) => addRoute('DELETE', path, handler),

    // Called by the app with the already-stripped sub-pathname
    _handle(req, res, subPath) {
      const method = req.method.toUpperCase()
      for (const route of routes) {
        if (route.method !== method) continue
        const match = subPath.match(route.regex)
        if (!match) continue
        req.params = {}
        route.paramNames.forEach((name, i) => {
          req.params[name] = decodeURIComponent(match[i + 1])
        })
        try {
          route.handler(req, res)
        } catch (err) {
          console.error('[miniRouter] unhandled route error:', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.json({ error: String(err) })
          }
        }
        return true
      }
      return false
    }
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

export function createApp() {
  const mounts = []       // { prefix, router }
  let allowedOrigins = null

  function setCORSHeaders(req, res) {
    const origin = req.headers.origin
    let allow = false
    if (!origin)                              allow = true
    else if (!allowedOrigins)                  allow = true
    else if (origin.endsWith('.vercel.app'))   allow = true
    else if (allowedOrigins.includes(origin))  allow = true

    if (allow && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    } else if (allow) {
      res.setHeader('Access-Control-Allow-Origin', '*')
    } else {
      // Origin not allowed — still need to set header so browser gets a proper rejection
      res.setHeader('Access-Control-Allow-Origin', 'null')
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    res.setHeader('Vary', 'Origin')
  }

  const app = {
    // Call this once with the origins array (or null for allow-all)
    setAllowedOrigins(origins) {
      allowedOrigins = origins
    },

    use(prefix, router) {
      mounts.push({ prefix, router })
    },

    listen(port, cb) {
      const server = createServer(async (req, res) => {
        wrapRes(res)
        setCORSHeaders(req, res)

        // Handle CORS preflight globally
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        // Parse URL
        const url = new URL(req.url, `http://localhost`)
        req.query = Object.fromEntries(url.searchParams.entries())
        const pathname = url.pathname

        // Parse JSON body
        req.body = await parseBody(req)

        // Match against mounted routers
        for (const { prefix, router } of mounts) {
          if (!pathname.startsWith(prefix)) continue
          const subPath = pathname.slice(prefix.length) || '/'
          if (router._handle(req, res, subPath)) return
        }

        // No route matched
        res.statusCode = 404
        res.json({ error: 'Not found' })
      })

      server.listen(port, cb)
      return server
    }
  }

  return app
}
