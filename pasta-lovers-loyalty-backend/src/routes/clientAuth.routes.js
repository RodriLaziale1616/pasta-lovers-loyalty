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
const {
  listPasskeys,
  registrationOptions,
  registrationVerify,
  authenticationOptions,
  authenticationVerify,
  deletePasskey,
} = require('../controllers/passkey.controller')

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

const passkeyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Demasiados intentos de acceso rápido. Esperá unos minutos.',
})

router.post('/request-otp', requestLimiter, requestOtp)
router.post('/verify-otp', verifyLimiter, verifyOtp)
router.post('/passkeys/auth/options', passkeyLimiter, authenticationOptions)
router.post('/passkeys/auth/verify', passkeyLimiter, authenticationVerify)
router.get('/me', clientAuth, me)
router.post('/logout', clientAuth, logout)
router.post('/qr', clientAuth, createDynamicQr)
router.get('/passkeys', clientAuth, listPasskeys)
router.post('/passkeys/register/options', clientAuth, passkeyLimiter, registrationOptions)
router.post('/passkeys/register/verify', clientAuth, passkeyLimiter, registrationVerify)
router.delete('/passkeys/:id', clientAuth, deletePasskey)

module.exports = router
