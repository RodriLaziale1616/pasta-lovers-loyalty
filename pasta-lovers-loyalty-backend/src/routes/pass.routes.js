const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const {
  listProducts,
  createProduct,
  issuePass,
  getPassByPublicId,
  redeemPass,
} = require('../controllers/pass.controller');

const router = express.Router();

router.get('/products', authMiddleware, listProducts);
router.post('/products', authMiddleware, createProduct);
router.post('/issue', authMiddleware, issuePass);
router.get('/:publicId', authMiddleware, getPassByPublicId);
router.post('/:publicId/redeem', authMiddleware, redeemPass);

module.exports = router;
