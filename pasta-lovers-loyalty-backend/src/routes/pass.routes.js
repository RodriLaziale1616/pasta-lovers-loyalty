const express = require('express')
const authMiddleware = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const rateLimit = require('../middleware/rateLimit.middleware')
const {
  issuePass,
  previewGift,
  claimGift,
  getPassByPublicId,
  redeemPass,
} = require('../controllers/pass.controller')
const {
  listActiveProducts,
  listManagedProducts,
  createProduct,
  updateProduct,
  setProductActive,
} = require('../controllers/product.controller')
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

// Catálogo para venta y administración.
router.get('/products', authMiddleware, listActiveProducts)
router.get('/products/manage', authMiddleware, requireRole('OWNER', 'MANAGER'), listManagedProducts)
router.post('/products', authMiddleware, requireRole('OWNER', 'MANAGER'), createProduct)
router.post('/products/:id/update', authMiddleware, requireRole('OWNER', 'MANAGER'), updateProduct)
router.post('/products/:id/status', authMiddleware, requireRole('OWNER', 'MANAGER'), setProductActive)

// Operaciones internas del mostrador.
router.post('/issue', authMiddleware, requireRole('OWNER', 'MANAGER', 'CASHIER'), issuePass)
router.post('/resolve-qr', authMiddleware, requireRole('OWNER', 'MANAGER', 'CASHIER'), resolveDynamicQr)
router.get('/:publicId', authMiddleware, requireRole('OWNER', 'MANAGER', 'CASHIER'), getPassByPublicId)
router.post('/:publicId/redeem', authMiddleware, requireRole('OWNER', 'MANAGER', 'CASHIER'), redeemPass)

module.exports = router
