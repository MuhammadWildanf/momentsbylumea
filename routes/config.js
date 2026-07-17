const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');
const { uploadLogo, uploadAsset } = require('../middleware/upload');
const { ROOT_DIR, CONFIG_FILE, EVENTS_DIR, DEFAULT_CONFIG } = require('../config/constants');

if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 4));
}

router.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        const { eventId } = req.query;
        let configData = null;
        if (eventId) {
            const eventFile = path.join(EVENTS_DIR, `${eventId}.json`);
            if (fs.existsSync(eventFile)) {
                configData = fs.readFileSync(eventFile);
            }
        }

        if (!configData) {
            configData = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE) : null;
        }

        if (configData) {
            res.json({ ...DEFAULT_CONFIG, ...JSON.parse(configData) });
        } else {
            res.json(DEFAULT_CONFIG);
        }
    } catch (err) {
        res.json(DEFAULT_CONFIG);
    }
});

router.post('/', requireAdmin, (req, res) => {
    try {
        const { eventId, ...updateData } = req.body;

        if (eventId) {
            const eventFile = path.join(EVENTS_DIR, `${eventId}.json`);
            let currentData = DEFAULT_CONFIG;
            if (fs.existsSync(eventFile)) {
                currentData = JSON.parse(fs.readFileSync(eventFile));
            }
            const newConfig = { ...currentData, ...updateData };
            fs.writeFileSync(eventFile, JSON.stringify(newConfig, null, 4));
        } else {
            const currentData = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE)) : DEFAULT_CONFIG;
            const newConfig = { ...currentData, ...updateData };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 4));
        }

        res.json({ status: 'success', message: 'Setelan UI berhasil disimpan!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Gagal menyimpan konfigurasi UI.' });
    }
});

router.post('/logo', uploadLogo.single('logo'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    const logoUrl = `/uploads_logo/${req.file.filename}`;
    res.json({ status: 'success', logoUrl });
});

router.post('/video', uploadLogo.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    const videoUrl = `/uploads_logo/${req.file.filename}`;
    res.json({ status: 'success', videoUrl });
});

router.post('/asset', uploadAsset.single('asset'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'Tidak ada file diunggah.' });
    const fileUrl = `/uploads_assets/${req.file.filename}`;
    res.json({ status: 'success', fileUrl });
});

router.get('/assets-list', (req, res) => {
    const dirs = [
        { path: path.join(ROOT_DIR, 'public', 'uploads_logo'), url: '/uploads_logo' },
        { path: path.join(ROOT_DIR, 'public', 'uploads_assets'), url: '/uploads_assets' }
    ];

    let allFiles = [];

    dirs.forEach(dir => {
        if (fs.existsSync(dir.path)) {
            const files = fs.readdirSync(dir.path);
            files.forEach(file => {
                if (!file.startsWith('.') && fs.lstatSync(path.join(dir.path, file)).isFile()) {
                    allFiles.push({
                        name: file,
                        url: `${dir.url}/${file}`,
                        type: dir.url.includes('logo') ? 'logo' : 'asset'
                    });
                }
            });
        }
    });

    res.json({ status: 'success', assets: allFiles });
});

router.delete('/asset-delete', (req, res) => {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ status: 'error', message: 'No file URL provided' });

    if (!fileUrl.startsWith('/uploads_logo/') && !fileUrl.startsWith('/uploads_assets/')) {
        return res.status(403).json({ status: 'error', message: 'Unauthorized path' });
    }

    const filePath = path.join(ROOT_DIR, 'public', fileUrl);

    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            res.json({ status: 'success', message: 'File deleted successfully' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: 'Failed to delete file' });
        }
    } else {
        res.status(404).json({ status: 'error', message: 'File not found on server' });
    }
});

module.exports = router;
