const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Helper to read JSON data
const readData = (filename) => {
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'data', filename));
        return JSON.parse(rawData);
    } catch (error) {
        console.error(`Error reading ${filename}`, error);
        return [];
    }
}

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// API Routes
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        res.json({ success: true, user: { username, role: req.body.role || 'user' } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/dashboard/stats', (req, res) => {
    res.json(readData('stats.json'));
});

app.get('/api/alerts', (req, res) => {
    res.json(readData('alerts.json'));
});

app.get('/api/countries', (req, res) => {
    res.json(readData('countries.json'));
});

// Fallback to index.html for SPA (if we use client-side routing, but it's single page now)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`TerraVue backend running on http://localhost:${PORT}`);
});
