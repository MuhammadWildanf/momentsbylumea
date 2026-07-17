const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');
const { SESSIONS_DIR } = require('../config/constants');

router.get('/:id', (req, res) => {
    const sessionId = req.params.id;
    const sessionFilePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    if (fs.existsSync(sessionFilePath)) {
        const data = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
        res.json({ status: 'success', data });
    } else {
        res.status(404).json({ status: 'error', message: 'Session not found' });
    }
});

router.get('/', (req, res) => {
    try {
        const { eventId } = req.query;
        if (!fs.existsSync(SESSIONS_DIR)) {
            return res.json({ status: 'success', sessions: [] });
        }
        const files = fs.readdirSync(SESSIONS_DIR);
        const sessions = [];
        files.forEach(file => {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(SESSIONS_DIR, file);
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const sessionData = JSON.parse(fileContent);

                    if (eventId) {
                        if (sessionData.eventId === eventId) {
                            sessions.push(sessionData);
                        }
                    } else {
                        if (!sessionData.eventId || sessionData.eventId === 'default') {
                            sessions.push(sessionData);
                        }
                    }
                } catch (e) {
                    console.error(`Error reading session file ${file}:`, e.message);
                }
            }
        });

        sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ status: 'success', sessions });
    } catch (err) {
        console.error('[API SESSIONS] Error:', err.message);
        res.status(500).json({ status: 'error', message: 'Gagal memuat data sesi' });
    }
});

router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const sessionId = req.params.id;
        if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'ID Sesi tidak valid' });
        }
        const sessionFilePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
        if (fs.existsSync(sessionFilePath)) {
            fs.unlinkSync(sessionFilePath);
            res.json({ status: 'success', message: 'Sesi berhasil dihapus' });
        } else {
            res.status(404).json({ status: 'error', message: 'Sesi tidak ditemukan' });
        }
    } catch (err) {
        console.error('[API DELETE SESSION] Error:', err.message);
        res.status(500).json({ status: 'error', message: 'Gagal menghapus sesi' });
    }
});

module.exports = router;
