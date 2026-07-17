const path = require('path');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

let gcpStorage = null;
try {
    const keyFile = process.env.GCP_KEY_FILE || 'gcp-key.json';
    gcpStorage = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
        keyFilename: path.join(__dirname, '..', keyFile)
    });
} catch (err) {
    console.error('[GCP] Error inisialisasi GCP Storage:', err.message);
}

const uploadToGCP = async (filePath, fileName, folderName = 'videobooth') => {
    const bucketName = process.env.GCP_BUCKET_NAME;
    if (!bucketName) throw new Error("GCP_BUCKET_NAME tidak diatur di .env");
    const bucket = gcpStorage.bucket(bucketName);

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

module.exports = { uploadToGCP };
