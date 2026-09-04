const express = require('express')
const rateLimit = require('../middleware/rateLimit.middleware')
const clientAuth = require('../middleware/clientAuth.middleware')
const {
  requestOtp,
  verifyOtp,
  me,
  logout,
  createDynamicQr,
} = require('../controllers/clientAuth.controller')

const router = express.Router()

const requestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: 'Demasiados pedidos de código. Esperá unos minutos.',
})

const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: 'Demasiados intentos de acceso. Esperá unos minutos.',
})

router.post('/request-otp', requestLimiter, requestOtp)
router.post('/verify-otp', verifyLimiter, verifyOtp)
router.get('/me', clientAuth, me)
router.post('/logout', clientAuth, logout)
router.post('/qr', clientAuth, createDynamicQr)

module.exports = router
