const buckets = new Map()

function rateLimit({ windowMs = 60_000, max = 20, message = 'Demasiados intentos. Probá de nuevo en unos minutos.' } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const key = `${req.ip}:${req.baseUrl}${req.route?.path || req.path}`
    const now = Date.now()
    const current = buckets.get(key)

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    current.count += 1

    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ ok: false, message })
    }

    next()
  }
}

module.exports = rateLimit
