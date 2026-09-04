const express = require('express')
const authMiddleware = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const rateLimit = require('../middleware/rateLimit.middleware')
const {
  listProducts,
  createProduct,
  issuePass,
  previewGift,
  claimGift,
  getPassByPublicId,
  redeemPass,
} = require('../controllers/pass.controller')
const { resolveDynamicQr } = require('../controllers/qr.controller')

const router = express.Router()

const giftPreviewLimiter = rateLimit({ windowMs: 60_000, max: 30 })
const giftClaimLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: 'Demasiados intentos de activación. Esperá unos minutos.',
})

// Activación pública de regalo, protegida por token aleatorio de un solo uso.
router.get('/gifts/claim/:token', giftPreviewLimiter, previewGift)
router.post('/gifts/claim/:token', giftClaimLimiter, claimGift)

// Operaciones internas del mostrador.
router.get('/products', authMiddleware, listProducts)
router.post('/products', authMiddleware, requireRole('OWNER', 'MANAGER'), createProduct)
router.post('/issue', authMiddleware, requireRole('OWNER', 'MANAGER', 'CASHIER'), issuePass)
router.post('/resolve-qr', authMiddleware, requireRole('OWNER', 'MANAGER', 'CASHIER'), resolveDynamicQr)
router.get('/:publicId', authMiddleware, requireRole('OWNER', 'MANAGER', 'CASHIER'), getPassByPublicId)
router.post('/:publicId/redeem', authMiddleware, requireRole('OWNER', 'MANAGER', 'CASHIER'), redeemPass)

module.exports = router
