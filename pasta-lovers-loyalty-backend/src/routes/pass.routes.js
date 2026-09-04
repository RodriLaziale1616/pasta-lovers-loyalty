const express = require('express')
const authMiddleware = require('../middleware/auth.middleware')
const {
  listProducts,
  createProduct,
  issuePass,
  previewGift,
  claimGift,
  getPassByPublicId,
  redeemPass,
} = require('../controllers/pass.controller')

const router = express.Router()

// Gift activation is public, but protected by a high-entropy one-time token.
router.get('/gifts/claim/:token', previewGift)
router.post('/gifts/claim/:token', claimGift)

// Everything else is staff-only.
router.get('/products', authMiddleware, listProducts)
router.post('/products', authMiddleware, createProduct)
router.post('/issue', authMiddleware, issuePass)
router.get('/:publicId', authMiddleware, getPassByPublicId)
router.post('/:publicId/redeem', authMiddleware, redeemPass)

module.exports = router
