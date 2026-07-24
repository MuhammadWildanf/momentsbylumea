const fs = require('fs');
const path = require('path');
const fastq = require('fastq');
const ffmpeg = require('fluent-ffmpeg');
const { uploadToGCP } = require('./gcp');
const { CONFIG_FILE, EVENTS_DIR, SESSIONS_DIR, DEFAULT_CONFIG } = require('../config/constants');

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

const worker = async (task) => {
    console.log(`\n[QUEUE] Memulai proses rendering untuk: ${task.name} (ID Sesi: ${task.sessionId})`);

    return new Promise(async (resolve, reject) => {
        try {
            const inputPath = task.videoPath;
            const photoInputPath = task.photoPath;
            let config = DEFAULT_CONFIG;
            if (task.eventId) {
                const eventFile = path.join(EVENTS_DIR, `${task.eventId}.json`);
                if (fs.existsSync(eventFile)) {
                    try {
                        config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(eventFile, 'utf8')) };
                    } catch (e) {
                        console.error(`[QUEUE ERROR] Gagal membaca config event: ${task.eventId}`, e);
                    }
                }
            } else if (fs.existsSync(CONFIG_FILE)) {
                try {
                    config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
                } catch (e) {
                    console.error("[QUEUE ERROR] Gagal membaca base config.json", e);
                }
            }
            const overlayPath = path.join(__dirname, '..', 'public', config.overlayImageUrl || 'overlay.png');

            const timestamp = Date.now();
            const outputVideoPath = path.join('uploads', `FINAL-${timestamp}-video.mp4`);
            const outputPhotoPath = path.join('uploads', `FINAL-${timestamp}-photo.jpg`);
            const sessionId = task.sessionId || `session-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

            console.log(`[GCP] Using Google Cloud Storage (Bucket: ${process.env.GCP_BUCKET_NAME})`);

            let videoWidth = 1080;
            let videoHeight = 1920;
            try {
                const dims = await getMediaDimensions(inputPath);
                videoWidth = dims.width;
                videoHeight = dims.height;
                console.log(`[RENDER] Resolusi Video Terdeteksi: ${videoWidth}x${videoHeight}`);
            } catch (e) {
                console.log(`[RENDER] Gagal mendeteksi resolusi video, menggunakan fallback 1080x1920.`);
            }

            let photoWidth = 1080;
            let photoHeight = 1920;
            if (photoInputPath && fs.existsSync(photoInputPath)) {
                try {
                    const dims = await getMediaDimensions(photoInputPath);
                    photoWidth = dims.width;
                    photoHeight = dims.height;
                    console.log(`[RENDER] Resolusi Foto Terdeteksi: ${photoWidth}x${photoHeight}`);
                } catch (e) {
                    console.log(`[RENDER] Gagal mendeteksi resolusi foto, menggunakan fallback 1080x1920.`);
                }
            }

            console.log(`[RENDER] Step 2/6: Processing Video with Overlay...`);
            let videoProcessed = false;
            await new Promise((res, rej) => {
                let cmd = ffmpeg(inputPath);
                if (fs.existsSync(overlayPath)) {
                    console.log(`[FFMPEG] Mendeteksi overlay.png, sedang merender bingkai...`);
                    cmd = cmd.input(overlayPath)
                        .complexFilter([`[1:v]scale=${videoWidth}:${videoHeight}[over];[0:v][over]overlay=0:0`])
                        .addOptions(['-preset ultrafast', '-crf 22']);
                } else {
                    cmd = cmd.addOptions(['-preset ultrafast', '-crf 22']);
                }

                cmd.output(outputVideoPath)
                    .on('start', (cmdLine) => console.log(`[FFMPEG] Spawned FFmpeg dengan command: ${cmdLine}`))
                    .on('progress', (progress) => {
                        if (progress.percent) console.log(`[FFMPEG] Rendering: ${Math.round(progress.percent)}% done`);
                    })
                    .on('end', () => {
                        console.log(`[QUEUE SUCCESS] Tugas Selesai! Video matang disimpan di: ${outputVideoPath}`);
                        videoProcessed = true;
                        res();
                    })
                    .on('error', (err) => {
                        console.error(`[RENDER] Video Error:`, err.message);
                        rej(err);
                    })
                    .run();
            });

            let photoProcessed = false;
            if (photoInputPath && fs.existsSync(photoInputPath)) {
                console.log(`[RENDER] Step 3/6: Processing Photo with Overlay...`);
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
                            console.log(`[RENDER] Photo Render Complete.`);
                            photoProcessed = true;
                            res();
                        })
                        .on('error', (err) => rej(err))
                        .run();
                });
            }

            console.log(`[UPLOAD] Step 4/6: Uploading to Cloud...`);
            let videoLink = null;
            let photoLink = null;
            const gcpFolderName = `${task.name} - ${sessionId}`;

            if (videoProcessed) {
                console.log(`[UPLOAD] Mengunggah video...`);
                videoLink = await uploadToGCP(outputVideoPath, `Video-${task.name}-${timestamp}.mp4`, gcpFolderName);
                console.log(`[UPLOAD] Sukses! Link Video: ${videoLink}`);
            }

            if (photoProcessed) {
                console.log(`[UPLOAD] Mengunggah photo...`);
                photoLink = await uploadToGCP(outputPhotoPath, `Photo-${task.name}-${timestamp}.jpg`, gcpFolderName);
                console.log(`[UPLOAD] Sukses! Link Photo: ${photoLink}`);
            }

            const sessionData = {
                id: sessionId,
                name: task.name,
                eventId: task.eventId || 'default',
                phone: task.phone || null,
                email: task.email || null,
                videoLink: videoLink,
                photoLink: photoLink,
                createdAt: new Date().toISOString()
            };
            if (!fs.existsSync(SESSIONS_DIR)) {
                fs.mkdirSync(SESSIONS_DIR, { recursive: true });
            }
            const sessionFilePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
            fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));

            [inputPath, photoInputPath, outputVideoPath, outputPhotoPath].forEach(p => {
                if (p && fs.existsSync(p)) fs.unlinkSync(p);
            });
            console.log(`[CLEANUP] temporary files deleted.`);
            resolve();

        } catch (err) {
            console.error(`\n[QUEUE ERROR] Error processing task for: ${task.name}`);
            console.error(`[ERROR DETAILS]:`, err);

            [task.videoPath, task.photoPath].forEach(p => {
                if (p && fs.existsSync(p)) {
                    try { fs.unlinkSync(p); } catch (e) { }
                }
            });
            reject(err);
        }
    });
};

const queue = fastq.promise(worker, 2);

module.exports = { queue };
