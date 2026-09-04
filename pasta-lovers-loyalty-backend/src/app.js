const express = require('express')
const cors = require('cors')
const prisma = require('./lib/prisma')
const authRoutes = require('./routes/auth.routes')
const clientRoutes = require('./routes/client.routes')
const clientAuthRoutes = require('./routes/clientAuth.routes')
const promotionRoutes = require('./routes/promotion.routes')
const passRoutes = require('./routes/pass.routes')

const app = express()

// Railway termina TLS antes de reenviar el request a Node.
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('X-Frame-Options', 'DENY')
  res.set('Referrer-Policy', 'no-referrer')
  res.set('Cache-Control', 'no-store')
  res.set('Permissions-Policy', 'geolocation=(), microphone=()')
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}))

app.use(express.json({ limit: '256kb' }))

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return res.json({
      ok: true,
      message: 'Modo Cafe Pass API funcionando',
      database: 'connected',
    })
  } catch {
    return res.status(500).json({
      ok: false,
      message: 'API disponible, pero la base de datos no responde',
    })
  }
})

app.use('/auth', authRoutes)
app.use('/client-auth', clientAuthRoutes)
app.use('/clients', clientRoutes)
app.use('/promotions', promotionRoutes)
app.use('/passes', passRoutes)

module.exports = app
