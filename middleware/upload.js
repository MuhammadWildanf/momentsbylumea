const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ROOT_DIR } = require('../config/constants');

const uploadsDir = path.join(ROOT_DIR, 'uploads');

const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: videoStorage });

const cpUpload = upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]);

const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(ROOT_DIR, 'public', 'uploads_logo');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'logo-' + Date.now() + ext);
    }
});
const uploadLogo = multer({ storage: logoStorage });

const assetStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(ROOT_DIR, 'public', 'uploads_assets');
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

module.exports = { cpUpload, uploadLogo, uploadAsset };
