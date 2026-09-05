const express = require('express')
const router = express.Router()

const { login, me } = require('../controllers/auth.controller')
const authMiddleware = require('../middleware/auth.middleware')
const rateLimit = require('../middleware/rateLimit.middleware')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de acceso. Esperá unos minutos antes de volver a intentar.',
})

router.post('/login', loginLimiter, login)
router.get('/me', authMiddleware, me)

module.exports = router
