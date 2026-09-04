const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/auth.middleware')

const {
  registerClient,
  getClientCardByToken,
  getClientByTokenForStaff,
  checkinClient,
  redeemClientReward,
  searchClients,
  getClientHistory,
  recoverClientCard,
} = require('../controllers/client.controller')
const {
  registerStaffClient,
  listClientPasses,
} = require('../controllers/modoClient.controller')

// Modo Cafe staff flows
router.post('/staff/register', authMiddleware, registerStaffClient)
router.get('/:id/passes', authMiddleware, listClientPasses)
router.get('/search', authMiddleware, searchClients)
router.get('/staff/by-token/:token', authMiddleware, getClientByTokenForStaff)

// Legacy Pasta Lovers routes kept only while the migration is being tested.
router.post('/register', registerClient)
router.get('/card/:token', getClientCardByToken)
router.post('/:id/checkin', authMiddleware, checkinClient)
router.post('/:id/redeem', authMiddleware, redeemClientReward)
router.get('/:id/history', authMiddleware, getClientHistory)
router.post('/recover-card', recoverClientCard)

module.exports = router
