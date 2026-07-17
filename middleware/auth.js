const ADMIN_SESSION_TOKEN = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);

const requireAdmin = (req, res, next) => {
    const token = req.headers['x-admin-token'];
    if (token === ADMIN_SESSION_TOKEN) {
        next();
    } else {
        res.status(401).json({ status: 'error', message: 'Unauthorized. Silakan login kembali.' });
    }
};

module.exports = { ADMIN_SESSION_TOKEN, requireAdmin };
