const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');

const {
  registerClient,
  getClientCardByToken,
  getClientByTokenForStaff,
  checkinClient,
  redeemClientReward,
  searchClients,
  getClientHistory,
  recoverClientCard,
} = require('../controllers/client.controller');

router.post('/register', registerClient);
router.get('/card/:token', getClientCardByToken);

router.get('/staff/by-token/:token', authMiddleware, getClientByTokenForStaff);
router.post('/:id/checkin', authMiddleware, checkinClient);
router.post('/:id/redeem', authMiddleware, redeemClientReward);
router.get('/search', authMiddleware, searchClients)
router.get('/:id/history', authMiddleware, getClientHistory);
router.post('/recover-card', recoverClientCard);

module.exports = router;
