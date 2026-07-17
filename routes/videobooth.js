const express = require('express');
const router = express.Router();
const { cpUpload } = require('../middleware/upload');
const { queue } = require('../services/queue');

router.post('/submit', (req, res, next) => {
    console.log(`\n[CONNECTION] Terdeteksi upaya pengiriman data...`);
    next();
}, cpUpload, (req, res) => {
    const { name, eventId } = req.body;
    console.log(`[API] Data diterima dari: ${name} (Event: ${eventId})`);

    try {
        const videoFile = req.files['video'] ? req.files['video'][0] : null;
        const photoFile = req.files['photo'] ? req.files['photo'][0] : null;

        if (!videoFile) {
            return res.status(400).json({ status: 'error', message: 'Tidak ada file video yang dikirim' });
        }

        const timestamp = Date.now();
        const sessionId = `session-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

        const eventParam = eventId ? `&event=${eventId}` : '';
        let domainStr = process.env.PUBLIC_DOMAIN || 'localhost:3000';
        let resultUrl = '';
        if (domainStr.startsWith('http')) {
            resultUrl = `${domainStr}/result?id=${sessionId}${eventParam}`;
        } else {
            const protocol = domainStr === 'localhost:3000' ? 'http' : 'https';
            resultUrl = `${protocol}://${domainStr}/result?id=${sessionId}${eventParam}`;
        }

        console.log(`[API] Menerima video dari ${name}. Memasukkan ke Antrean dengan ID Sesi: ${sessionId}`);

        queue.push({
            sessionId: sessionId,
            name: name || 'Guest',
            eventId: eventId || 'default',
            videoPath: videoFile.path,
            photoPath: photoFile ? photoFile.path : null
        });

        res.status(200).json({
            status: 'success',
            message: 'Data berhasil disimpan dan sedang diproses',
            data: { name, sessionId, resultUrl }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server' });
    }
});

module.exports = router;
