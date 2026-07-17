const express = require('express');
const router = express.Router();
const { ADMIN_SESSION_TOKEN } = require('../middleware/auth');

router.post('/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'lumeaadmin';
    if (password === adminPassword) {
        res.json({ status: 'success', token: ADMIN_SESSION_TOKEN });
    } else {
        res.status(401).json({ status: 'error', message: 'Password salah!' });
    }
});

router.get('/verify', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token === ADMIN_SESSION_TOKEN) {
        res.json({ status: 'success', valid: true });
    } else {
        res.status(401).json({ status: 'error', valid: false });
    }
});

module.exports = router;
