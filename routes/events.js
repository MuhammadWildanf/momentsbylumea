const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');
const { EVENTS_DIR, SESSIONS_DIR, DEFAULT_CONFIG } = require('../config/constants');

if (!fs.existsSync(EVENTS_DIR)) fs.mkdirSync(EVENTS_DIR, { recursive: true });

const initialEventFile = path.join(EVENTS_DIR, 'audric-catherine.json');
if (!fs.existsSync(initialEventFile)) {
    let baseConfig = DEFAULT_CONFIG;
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
            console.error("Error reading base config:", e);
        }
    }
    const audricConfig = {
        ...baseConfig,
        id: 'audric-catherine',
        eventName: 'Audric & Catherine',
        createdAt: new Date().toISOString()
    };
    fs.writeFileSync(initialEventFile, JSON.stringify(audricConfig, null, 4));
}

router.get('/', requireAdmin, (req, res) => {
    try {
        let sessionCounts = {};
        if (fs.existsSync(SESSIONS_DIR)) {
            const sessionFiles = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
            sessionFiles.forEach(file => {
                try {
                    const sessionData = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8'));
                    const eId = sessionData.eventId || 'default';
                    sessionCounts[eId] = (sessionCounts[eId] || 0) + 1;
                } catch(err) {}
            });
        }

        const files = fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith('.json'));
        const events = files.map(file => {
            const data = JSON.parse(fs.readFileSync(path.join(EVENTS_DIR, file), 'utf8'));
            const id = data.id || file.replace('.json', '');
            return {
                id: id,
                name: data.eventName || 'Unnamed Event',
                eventDate: data.eventDate || null,
                createdAt: data.createdAt || null,
                totalSessions: sessionCounts[id] || 0
            };
        });
        res.json({ status: 'success', events });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

router.post('/', requireAdmin, (req, res) => {
    try {
        const { id, name, eventDate } = req.body;
        if (!id || !name) return res.status(400).json({ status: 'error', message: 'ID dan Nama Event wajib diisi' });

        const filePath = path.join(EVENTS_DIR, `${id}.json`);
        if (fs.existsSync(filePath)) {
            return res.status(400).json({ status: 'error', message: 'Event ID sudah digunakan' });
        }

        const newEventConfig = {
            ...DEFAULT_CONFIG,
            id,
            eventName: name,
            eventDate: eventDate || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };
        fs.writeFileSync(filePath, JSON.stringify(newEventConfig, null, 4));
        res.json({ status: 'success', event: { id, name, eventDate } });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const filePath = path.join(EVENTS_DIR, `${req.params.id}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ status: 'success', message: 'Event dihapus' });
        } else {
            res.status(404).json({ status: 'error', message: 'Event tidak ditemukan' });
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

module.exports = router;
