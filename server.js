const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fastq = require('fastq');
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const { Readable } = require('stream');

// Initialize Express App
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] })); // Serve frontend html with clean URLs

// Setup Multer for Video Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
// Middleware untuk handle multiple upload (video & photo)
const cpUpload = upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]);

const ffmpeg = require('fluent-ffmpeg');



// --- SETUP GCP STORAGE ---
let gcpStorage = null;
try {
    const keyFile = process.env.GCP_KEY_FILE || 'gcp-key.json';
    gcpStorage = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
        keyFilename: path.join(__dirname, keyFile)
    });
} catch (err) {
    console.error('[GCP] ❌ Error inisialisasi GCP Storage:', err.message);
}

const uploadToGCP = async (filePath, fileName, folderName = 'videobooth') => {
    const bucketName = process.env.GCP_BUCKET_NAME;
    if (!bucketName) throw new Error("GCP_BUCKET_NAME tidak diatur di .env");
    const bucket = gcpStorage.bucket(bucketName);

    // Hapus karakter aneh dari nama folder agar URL lebih aman
    const safeFolderName = folderName.replace(/[^a-zA-Z0-9 ]/g, '_');
    const destination = `${safeFolderName}/${fileName}`;

    await bucket.upload(filePath, {
        destination: destination,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });

    return `https://storage.googleapis.com/${bucketName}/${destination}`;
};
// ------------------------------


// Helper function to read media dimensions dynamically using ffprobe
const getMediaDimensions = (filePath) => {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                console.warn(`[FFPROBE WARNING] Gagal mendeteksi resolusi untuk ${filePath}, menggunakan default 1080x1920:`, err.message);
                return resolve({ width: 1080, height: 1920 });
            }
            const stream = metadata.streams.find(s => s.codec_type === 'video');
            if (!stream) {
                return resolve({ width: 1080, height: 1920 });
            }
            resolve({ width: stream.width, height: stream.height });
        });
    });
};

// Background Queue Worker Engine
const worker = async (task) => {
    console.log(`\n[QUEUE] ⏳ Memulai proses rendering untuk: ${task.name} (ID Sesi: ${task.sessionId})`);

    return new Promise(async (resolve, reject) => {
        try {
            const inputPath = task.videoPath;
            const photoInputPath = task.photoPath; // ✅ TAMBAHKAN INI
            const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
            const overlayPath = path.join(__dirname, 'public', config.overlayImageUrl || 'overlay.png');

            const timestamp = Date.now();
            const outputVideoPath = path.join('uploads', `FINAL-${timestamp}-video.mp4`);
            const outputPhotoPath = path.join('uploads', `FINAL-${timestamp}-photo.jpg`);
            const sessionId = task.sessionId || `session-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

            // 1. GCP Storage Info
            console.log(`[GCP] ☁️ Using Google Cloud Storage (Bucket: ${process.env.GCP_BUCKET_NAME})`);

            // Get dynamic dimensions for video & photo to ensure 100% perfect scaling across all FFmpeg versions
            let videoWidth = 1080;
            let videoHeight = 1920;
            try {
                const dims = await getMediaDimensions(inputPath);
                videoWidth = dims.width;
                videoHeight = dims.height;
                console.log(`[RENDER] 🎬 Resolusi Video Terdeteksi: ${videoWidth}x${videoHeight}`);
            } catch (e) {
                console.log(`[RENDER] ⚠️ Gagal mendeteksi resolusi video, menggunakan fallback 1080x1920.`);
            }

            let photoWidth = 1080;
            let photoHeight = 1920;
            if (photoInputPath && fs.existsSync(photoInputPath)) {
                try {
                    const dims = await getMediaDimensions(photoInputPath);
                    photoWidth = dims.width;
                    photoHeight = dims.height;
                    console.log(`[RENDER] 📸 Resolusi Foto Terdeteksi: ${photoWidth}x${photoHeight}`);
                } catch (e) {
                    console.log(`[RENDER] ⚠️ Gagal mendeteksi resolusi foto, menggunakan fallback 1080x1920.`);
                }
            }

            // 2. Process Video
            console.log(`[RENDER] 🎬 Step 2/6: Processing Video with Overlay...`);
            let videoProcessed = false;
            await new Promise((res, rej) => {
                let cmd = ffmpeg(inputPath);
                if (fs.existsSync(overlayPath)) {
                    console.log(`[FFMPEG] Mendeteksi overlay.png, sedang merender bingkai...`);
                    cmd = cmd.input(overlayPath)
                        .complexFilter([`[1:v]scale=${videoWidth}:${videoHeight}[over];[0:v][over]overlay=0:0`])
                        .addOptions(['-preset ultrafast', '-crf 18']);
                } else {
                    cmd = cmd.addOptions(['-preset ultrafast', '-crf 18']);
                }

                cmd.output(outputVideoPath)
                    .on('start', (cmdLine) => console.log(`[FFMPEG] Spawned FFmpeg dengan command: ${cmdLine}`))
                    .on('progress', (progress) => {
                        if (progress.percent) console.log(`[FFMPEG] Rendering: ${Math.round(progress.percent)}% done`);
                    })
                    .on('end', () => {
                        console.log(`[QUEUE SUCCESS] 🌟 Tugas Selesai! Video matang disimpan di: ${outputVideoPath}`);
                        videoProcessed = true;
                        res();
                    })
                    .on('error', (err) => {
                        console.error(`[RENDER] ❌ Video Error:`, err.message);
                        rej(err);
                    })
                    .run();
            });

            // 3. Process Photo
            let photoProcessed = false;
            if (photoInputPath && fs.existsSync(photoInputPath)) {
                console.log(`[RENDER] 📸 Step 3/6: Processing Photo with Overlay...`);
                await new Promise((res, rej) => {
                    let cmd = ffmpeg(photoInputPath);
                    if (fs.existsSync(overlayPath)) {
                        cmd = cmd.input(overlayPath)
                            .complexFilter([`[1:v]scale=${photoWidth}:${photoHeight}[over];[0:v][over]overlay=0:0`])
                            .addOptions(['-preset ultrafast', '-q:v 2']);
                    } else {
                        cmd = cmd.addOptions(['-q:v 2']);
                    }
                    cmd.output(outputPhotoPath)
                        .on('end', () => {
                            console.log(`[RENDER] ✅ Photo Render Complete.`);
                            photoProcessed = true;
                            res();
                        })
                        .on('error', (err) => rej(err))
                        .run();
                });
            }
            // 4. Upload to Cloud
            console.log(`[UPLOAD] ☁️ Step 4/6: Uploading to Cloud...`);
            let videoLink = null;
            let photoLink = null;
            const gcpFolderName = `${task.name} - ${sessionId}`;

            if (videoProcessed) {
                console.log(`[UPLOAD] ☁️ Mengunggah video...`);
                videoLink = await uploadToGCP(outputVideoPath, `Video-${task.name}-${timestamp}.mp4`, gcpFolderName);
                console.log(`[UPLOAD] ✅ Sukses! Link Video: ${videoLink}`);
            }

            if (photoProcessed) {
                console.log(`[UPLOAD] 📸 Mengunggah photo...`);
                photoLink = await uploadToGCP(outputPhotoPath, `Photo-${task.name}-${timestamp}.jpg`, gcpFolderName);
                console.log(`[UPLOAD] ✅ Sukses! Link Photo: ${photoLink}`);
            }

            // 4.5 Save Session Data locally for Result Preview Page
            const sessionData = {
                id: sessionId,
                name: task.name,
                phone: task.phone || null,
                email: task.email || null,
                videoLink: videoLink,
                photoLink: photoLink,
                createdAt: new Date().toISOString()
            };
            const sessionsDir = path.join(__dirname, 'data', 'sessions');
            if (!fs.existsSync(sessionsDir)) {
                fs.mkdirSync(sessionsDir, { recursive: true });
            }
            const sessionFilePath = path.join(sessionsDir, `${sessionId}.json`);
            fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));

            // This is the link we actually send to the user
            let domainStr = process.env.PUBLIC_DOMAIN || 'localhost:3000';
            let localResultLink = '';
            if (domainStr.startsWith('http')) {
                localResultLink = `${domainStr}/result?id=${sessionId}`;
            } else {
                const protocol = domainStr === 'localhost:3000' ? 'http' : 'https';
                localResultLink = `${protocol}://${domainStr}/result?id=${sessionId}`;
            }



            // 6. Cleanup
            [inputPath, photoInputPath, outputVideoPath, outputPhotoPath].forEach(p => {
                if (p && fs.existsSync(p)) fs.unlinkSync(p);
            });
            console.log(`[CLEANUP] 🧹 temporary files deleted.`);
            resolve();

        } catch (err) {
            console.error(`\n[QUEUE ERROR] ❌ Error processing task for: ${task.name}`);
            console.error(`[ERROR DETAILS]:`, err);

            // Clean up even on error to prevent disk filling
            [task.videoPath, task.photoPath].forEach(p => {
                if (p && fs.existsSync(p)) {
                    try { fs.unlinkSync(p); } catch (e) { }
                }
            });
            reject(err);
        }
    });
};

// Initiate FastQ with concurrency = 2 (allow simultaneous upload while rendering)
const queue = fastq.promise(worker, 2);

// API Endpoint: Get Session Result
app.get('/api/result/:id', (req, res) => {
    const sessionId = req.params.id;
    const sessionFilePath = path.join(__dirname, 'data', 'sessions', `${sessionId}.json`);

    if (fs.existsSync(sessionFilePath)) {
        const data = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
        res.json({ status: 'success', data });
    } else {
        res.status(404).json({ status: 'error', message: 'Session not found' });
    }
});

// API Endpoint: Get All Sessions
app.get('/api/sessions', (req, res) => {
    try {
        const sessionsDir = path.join(__dirname, 'data', 'sessions');
        if (!fs.existsSync(sessionsDir)) {
            return res.json({ status: 'success', sessions: [] });
        }
        const files = fs.readdirSync(sessionsDir);
        const sessions = [];
        files.forEach(file => {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(sessionsDir, file);
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const sessionData = JSON.parse(fileContent);
                    sessions.push(sessionData);
                } catch (e) {
                    console.error(`Error reading session file ${file}:`, e.message);
                }
            }
        });

        // Sort by createdAt descending (newest first)
        sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ status: 'success', sessions });
    } catch (err) {
        console.error('[API SESSIONS] Error:', err.message);
        res.status(500).json({ status: 'error', message: 'Gagal memuat data sesi' });
    }
});

// API Endpoint: Delete Session
app.delete('/api/sessions/:id', (req, res) => {
    try {
        const sessionId = req.params.id;
        if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'ID Sesi tidak valid' });
        }
        const sessionFilePath = path.join(__dirname, 'data', 'sessions', `${sessionId}.json`);
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

// API Endpoint: Submit Video
app.post('/api/videobooth/submit', (req, res, next) => {
    console.log(`\n[CONNECTION] ⚡ Terdeteksi upaya pengiriman data...`);
    next();
}, cpUpload, (req, res) => {
    // 1. LOG IMMEDIATELY
    const { name } = req.body;
    console.log(`[API] 📥 Data diterima dari: ${name}`);

    try {
        const videoFile = req.files['video'] ? req.files['video'][0] : null;
        const photoFile = req.files['photo'] ? req.files['photo'][0] : null;

        if (!videoFile) {
            return res.status(400).json({ status: 'error', message: 'Tidak ada file video yang dikirim' });
        }

        const timestamp = Date.now();
        const sessionId = `session-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

        let domainStr = process.env.PUBLIC_DOMAIN || 'localhost:3000';
        let resultUrl = '';
        if (domainStr.startsWith('http')) {
            resultUrl = `${domainStr}/result?id=${sessionId}`;
        } else {
            const protocol = domainStr === 'localhost:3000' ? 'http' : 'https';
            resultUrl = `${protocol}://${domainStr}/result?id=${sessionId}`;
        }

        console.log(`[API] Menerima video dari ${name}. Memasukkan ke Antrean dengan ID Sesi: ${sessionId}`);

        // PUSH task ke Queue (Background)
        queue.push({
            sessionId: sessionId,
            name: name || 'Guest',
            videoPath: videoFile.path,
            photoPath: photoFile ? photoFile.path : null
        });

        // KEMBALIKAN response secepat mungkin dengan URL halaman hasil
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



// ===============================
// Queue Worker: Proses Video & Upload
// ===============================
const CONFIG_FILE = path.join(__dirname, 'config.json');
const DEFAULT_CONFIG = {
    title: 'Audric & Catherine',
    subtitle: 'A special moment awaits you!',
    descPremium: 'Enter your details to unveil a personalized wedding experience.',
    startText: 'START HERE',
    messageTemplate: 'Halo {name}! ✨\n\nKenangan Anda di ScribbleBooth sudah siap! Silakan lihat dan download melalui link folder di bawah ini:\n\n🔗 {link}\n\nTerima kasih sudah mampir!',
    emailSubject: 'Kenangan ScribbleBooth Anda sudah siap! ✨',
    // === MEDIA ===
    logoUrl: "/uploads_logo/logo-placeholder.png",
    bottomLeftLogoUrl: '/logo-lumea.png',
    tutorialVideoUrl: "",
    resultVideoUrl: "",
    frameColor: "#3d3d3d",
    recordingDuration: 15,
    qrResetDuration: 45,
    readyTextMain: "Get your pen and look at mirror.",
    readyTextSub: "Hit the record button when you are ready.",
    reviewTextMain: "Please review your video,",
    reviewTextSub: "you can RETAKE or NEXT.",
    successTextMain: "Your memories are ready! ✨",
    successTextSub: "Scan this QR code to view and download your video and photo.",
    accentColor: "#d3bb7c",
    titleColor: "#f0e5c7",
    subtitleColor: "#f0e5c7",
    connectorColor: "#f0e5c7",
    descColor: "#cdcdcd",
    startTextColor: "#1a0f0a",
    readyTextColor: "#f0e5c7",
    reviewTextColor: "#f0e5c7",
    successTextColor: "#f0e5c7",
    formLabelName: "Name",
    formLabelNameColor: "#f0e5c7",
    formPlaceholderName: "Please input your name",
    formSubmitText: "SUBMIT",
    formSubmitTextColor: "#1a0f0a",
    readyHeaderTitle: "Ready To Play Words?",
    readyHeaderTitleColor: "#f0e5c7",
    readyHeaderSubtitle: "Write a simple letter to the Bride and Groom",
    readyHeaderSubtitleColor: "#f0e5c7",
    readyBackText: "BACK",
    readyBackTextColor: "#e7e5d8",
    reviewRetakeText: "RETAKE",
    reviewRetakeTextColor: "#e7e5d8",
    reviewPhotoText: "TAKE A PHOTO",
    reviewPhotoTextColor: "#1a0f0a",
    photoHeaderTitle: "Ready for Photo Session?",
    photoHeaderTitleColor: "#f0e5c7",
    photoHeaderSubtitle: "Strike a beautiful pose for the camera",
    photoHeaderSubtitleColor: "#f0e5c7",
    photoInstructionMain: "Look at the camera and smile.",
    photoInstructionSub: "Hit the shutter button when you are ready.",
    photoInstructionTextColor: "#f0e5c7",
    photoBackText: "BACK",
    photoBackTextColor: "#e7e5d8",
    finalHeaderTitle: "Review your session.",
    finalHeaderTitleColor: "#f0e5c7",
    finalVideoLabel: "VIDEO",
    finalPhotoLabel: "PHOTO",
    finalRetakeAllText: "RETAKE ALL",
    finalRetakeAllTextColor: "#e7e5d8",
    finalRetakePhotoText: "RETAKE PHOTO",
    finalRetakePhotoTextColor: "#e7e5d8",
    finalUploadText: "UPLOAD BOTH",
    finalUploadTextColor: "#1a0f0a",
    successFooterText: "Thank you for being part of this moment",
    successFooterTextColor: "#cdcdcd",
    successDoneText: "Done",
    successDoneTextColor: "#1a0f0a",
    eventDate: "2026-05-23",
    readyCdText: "Recording Begins in...",
    recordingCdText: "Recording...",
    photoCdText: "Taking Photo in...",
    previewPanelFooter: "Preview Your Moment",
    loadingPreviewText: "Loading Preview...",
    loadingTutorialText: "Loading Tutorial...",
    readyCountdownText: "Start Recording",
    photoCountdownText: "Take a Photo",
    // === GUEST RESULT PAGE ===
    resultLoadingText: "Loading your memories... ✨",
    resultErrorText: "Sorry, your session was not found or has expired.",
    resultProcessingText: "Processing your video & photo... please wait a moment. ✨<br><small style=\"font-size: 14px; opacity: 0.8; display: block; margin-top: 10px;\">Rendering process usually takes 10-15 seconds.</small>",
    resultSaveVideoText: "🎬 Save Your Video",
    resultSavePhotoText: "📸 Save Your Photo",
    resultFooterText: "Here’s to the moments you’ll always look back on - @momentsbylumea",
// Buat config.json jika baru pertama kali di-run
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 4));
}

app.get('/api/config', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        const configData = fs.readFileSync(CONFIG_FILE);
        res.json({ ...DEFAULT_CONFIG, ...JSON.parse(configData) });
    } catch (err) {
        res.json(DEFAULT_CONFIG);
    }
});

app.post('/api/config', (req, res) => {
    try {
        const currentData = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE)) : DEFAULT_CONFIG;
        const newConfig = { ...currentData, ...req.body };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 4));
        res.json({ status: 'success', message: 'Setelan UI berhasil disimpan!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Gagal menyimpan konfigurasi UI.' });
    }
});

// --- LOGO UPLOAD ENDPOINT ---
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads_logo');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'logo-' + Date.now() + ext);
    }
});
const uploadLogo = multer({ storage: logoStorage });

// Endpoint untuk Upload Logo, Background, dsb
app.post('/api/config/logo', uploadLogo.single('logo'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

    // Path untuk diakses di frontend
    const logoUrl = `/uploads_logo/${req.file.filename}`;

    res.json({ status: 'success', logoUrl });
});

// Endpoint untuk Upload Video (Tutorial/Result)
app.post('/api/config/video', uploadLogo.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

    // Path untuk diakses di frontend
    const videoUrl = `/uploads_logo/${req.file.filename}`;

    res.json({ status: 'success', videoUrl });
});

// --- ASSET UPLOAD ENDPOINT (BG, FRAME, OVERLAY) ---
const assetStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads_assets');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = file.fieldname + '-' + Date.now() + ext;
        cb(null, name);
    }
});
const uploadAsset = multer({ storage: assetStorage });

app.post('/api/config/asset', uploadAsset.single('asset'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'Tidak ada file diunggah.' });
    const fileUrl = `/uploads_assets/${req.file.filename}`;
    res.json({ status: 'success', fileUrl });
});

// --- ASSET MANAGEMENT ENDPOINTS (LIST & DELETE) ---
app.get('/api/config/assets-list', (req, res) => {
    const dirs = [
        { path: path.join(__dirname, 'public', 'uploads_logo'), url: '/uploads_logo' },
        { path: path.join(__dirname, 'public', 'uploads_assets'), url: '/uploads_assets' }
    ];

    let allFiles = [];

    dirs.forEach(dir => {
        if (fs.existsSync(dir.path)) {
            const files = fs.readdirSync(dir.path);
            files.forEach(file => {
                // Ignore hidden files and directories
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

app.delete('/api/config/asset-delete', (req, res) => {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ status: 'error', message: 'No file URL provided' });

    // Security: Only allow deleting from authorized folders
    if (!fileUrl.startsWith('/uploads_logo/') && !fileUrl.startsWith('/uploads_assets/')) {
        return res.status(403).json({ status: 'error', message: 'Unauthorized path' });
    }

    const filePath = path.join(__dirname, 'public', fileUrl);

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

// --- API TO FORCE DOWNLOAD (Bypass Browser Player) ---
const https = require('https');
app.get('/api/download', (req, res) => {
    const fileUrl = req.query.url;
    const filename = req.query.name || `ScribbleBooth-${Date.now()}`;

    if (!fileUrl || !fileUrl.startsWith('http')) {
        return res.status(400).send('Invalid URL');
    }

    https.get(fileUrl, (response) => {
        // Set attachment header to force download dialog
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');

        // Pipe the cloud storage stream directly to the user
        response.pipe(res);
    }).on('error', (err) => {
        console.error('[DOWNLOAD] Error proxying file:', err.message);
        res.status(500).send('Gagal mengunduh file.');
    });
});

app.listen(port, () => {
    console.log(`🚀 Videobooth Backend Server beroperasi di http://localhost:${port}`);
    console.log(`📱 Panel Config UI di: http://localhost:${port}/config.html`);
    console.log(`🎥 Akses Web Utama di: http://localhost:${port}/`);
});
