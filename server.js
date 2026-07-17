const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { EVENTS_DIR } = require('./config/constants');
const fs = require('fs');

// Ensure data directories exist
if (!fs.existsSync(EVENTS_DIR)) fs.mkdirSync(EVENTS_DIR, { recursive: true });

// Initialize Express App
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/result', require('./routes/sessions'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/videobooth', require('./routes/videobooth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/config', require('./routes/config'));
app.use('/api/download', require('./routes/download'));

app.listen(port, () => {
    console.log(`Videobooth Backend Server beroperasi di http://localhost:${port}`);
    console.log(`Panel Config UI di: http://localhost:${port}/config.html`);
    console.log(`Akses Web Utama di: http://localhost:${port}/`);
});
