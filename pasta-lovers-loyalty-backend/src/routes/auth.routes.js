const express = require('express');
const router = express.Router();

const { login, me } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/me', authMiddleware, me);

module.exports = router;