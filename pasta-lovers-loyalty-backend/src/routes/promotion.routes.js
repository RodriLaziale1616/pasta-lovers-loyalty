const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/auth.middleware')
const {
  getActivePromotions,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  togglePromotion,
  deletePromotion,
} = require('../controllers/promotion.controller')

router.get('/active', getActivePromotions)

router.get('/', authMiddleware, getAllPromotions)
router.post('/', authMiddleware, createPromotion)
router.put('/:id', authMiddleware, updatePromotion)
router.patch('/:id/toggle', authMiddleware, togglePromotion)
router.delete('/:id', authMiddleware, deletePromotion)

module.exports = router