const express = require('express')
const cors = require('cors')
const prisma = require('./lib/prisma')
const authRoutes = require('./routes/auth.routes')
const clientRoutes = require('./routes/client.routes')
const promotionRoutes = require('./routes/promotion.routes')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}))

app.use(express.json({ limit: '2mb' }))

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return res.json({
      ok: true,
      message: 'Pasta Lovers Loyalty API funcionando',
      database: 'connected',
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'API ok, pero error conectando a la base de datos',
      error: error.message,
    })
  }
})

app.use('/auth', authRoutes)
app.use('/clients', clientRoutes)
app.use('/promotions', promotionRoutes)

module.exports = app