const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const { searchClients } = require('../controllers/client.controller')
const {
  registerStaffClient,
  listClientPasses,
} = require('../controllers/modoClient.controller')

router.use(authMiddleware)

router.post('/staff/register', requireRole('OWNER', 'MANAGER', 'CASHIER'), registerStaffClient)
router.get('/search', requireRole('OWNER', 'MANAGER', 'CASHIER'), searchClients)
router.get('/:id/passes', requireRole('OWNER', 'MANAGER', 'CASHIER'), listClientPasses)

module.exports = router
