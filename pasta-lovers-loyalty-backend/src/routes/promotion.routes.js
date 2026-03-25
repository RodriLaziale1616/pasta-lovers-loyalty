const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/auth.middleware')
const {
  getActivePromotions,
  createPromotion,
} = require('../controllers/promotion.controller')

router.get('/active', getActivePromotions)
router.post('/', authMiddleware, createPromotion)

module.exports = router