// ════════════════════════════════════════════════════════════
//  WAFEO Digital Twin — Full Backend Server
//  Node.js / Express  |  All API endpoints + JWT auth
// ════════════════════════════════════════════════════════════

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const jwt      = require('jsonwebtoken');
const compression = require('compression');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'wafeo-secret-2024-change-in-production';

// ─── CORS — allow GitHub Pages frontend ─────────────────────
app.use(cors({
  origin: [
    'https://norbertmuzila.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(compression());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// ─── HELPERS ────────────────────────────────────────────────
const dataPath = (filename) => path.join(__dirname, 'data', filename);

function readData(filename) {
  try {
    return JSON.parse(fs.readFileSync(dataPath(filename), 'utf8'));
  } catch (err) {
    console.error(`[ERROR] reading ${filename}:`, err.message);
    return null;
  }
}

function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Missing token' });
  const token = header.replace('Bearer ', '').trim();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── NEWS CACHE (30-min TTL) ─────────────────────────────────
const newsCache = { data: null, fetchedAt: 0, ttl: 30 * 60 * 1000 };

async function fetchLiveNews() {
  const now = Date.now();
  if (newsCache.data && (now - newsCache.fetchedAt) < newsCache.ttl) {
    return newsCache.data;
  }

  const all = [];

  const urls = [
    { url: 'https://api.reliefweb.int/v1/reports?appname=wafeo&filter[field]=theme.name&filter[value]=Food%20and%20Nutrition&limit=8&sort[]=date:desc&fields[include][]=title&fields[include][]=date.created&fields[include][]=source.name&fields[include][]=country.name&fields[include][]=url', tag: 'Food Security' },
    { url: 'https://api.reliefweb.int/v1/reports?appname=wafeo&filter[field]=theme.name&filter[value]=Agriculture&limit=6&sort[]=date:desc&fields[include][]=title&fields[include][]=date.created&fields[include][]=source.name&fields[include][]=country.name&fields[include][]=url', tag: 'Agriculture' },
    { url: 'https://api.reliefweb.int/v1/reports?appname=wafeo&filter[field]=theme.name&filter[value]=Water%20Sanitation%20Hygiene&limit=6&sort[]=date:desc&fields[include][]=title&fields[include][]=date.created&fields[include][]=source.name&fields[include][]=country.name&fields[include][]=url', tag: 'Water' }
  ];

  await Promise.allSettled(urls.map(async ({ url, tag }) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data && data.data) {
        data.data.forEach(r => all.push({ ...r.fields, tag }));
      }
    } catch (e) {
      console.warn(`[WARN] news fetch (${tag}):`, e.message);
    }
  }));

  // Deduplicate and sort newest first
  const seen = new Set();
  const unique = all.filter(n => {
    if (seen.has(n.title)) return false;
    seen.add(n.title);
    return true;
  }).sort((a, b) => new Date(b.date?.created || 0) - new Date(a.date?.created || 0));

  newsCache.data = unique;
  newsCache.fetchedAt = now;
  return unique;
}

// ════════════════════════════════════════════════════════════
//  API ROUTES
// ════════════════════════════════════════════════════════════

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'WAFEO Digital Twin API',
    version: '2.0.0',
    uptime:  process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ─── Auth: Login ─────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = readData('users.json');
  if (!users) return res.status(500).json({ error: 'User store unavailable' });

  const user = users.find(u =>
    u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ─── Auth: Logout ────────────────────────────────────────────
app.post('/api/auth/logout', auth, (req, res) => {
  // Stateless JWT — client discards the token
  res.json({ message: 'Logged out successfully' });
});

// ─── Dashboard Stats ─────────────────────────────────────────
app.get('/api/dashboard/stats', auth, (req, res) => {
  const stats = readData('stats.json');
  if (!stats) return res.status(500).json({ error: 'Stats unavailable' });
  res.json(stats);
});

// ─── Alerts ──────────────────────────────────────────────────
app.get('/api/alerts', auth, (req, res) => {
  const data = readData('alerts.json');
  if (!data) return res.status(500).json({ error: 'Alerts unavailable' });
  res.json({ alerts: data, total: data.length });
});

// ─── Satellites ──────────────────────────────────────────────
app.get('/api/satellites', auth, (req, res) => {
  const data = readData('satellites.json');
  if (!data) return res.status(500).json({ error: 'Satellite data unavailable' });
  res.json({ satellites: data, count: data.length, lastUpdated: new Date().toISOString() });
});

// ─── NDVI by Region ──────────────────────────────────────────
app.get('/api/analytics/ndvi-by-region', auth, (req, res) => {
  const data = readData('ndvi.json');
  if (!data) return res.status(500).json({ error: 'NDVI data unavailable' });
  res.json({ data, source: 'Sentinel-2 / MODIS', updatedAt: new Date().toISOString() });
});

// ─── Fields (Precision Farming) ──────────────────────────────
app.get('/api/fields', auth, (req, res) => {
  const data = readData('fields.json');
  if (!data) return res.status(500).json({ error: 'Field data unavailable' });
  res.json({ fields: data, total: data.length });
});

// ─── Water Resources ─────────────────────────────────────────
app.get('/api/water', auth, (req, res) => {
  const data = readData('water.json');
  if (!data) return res.status(500).json({ error: 'Water data unavailable' });
  res.json(data);
});

// ─── Food Security ────────────────────────────────────────────
app.get('/api/food-security', auth, (req, res) => {
  const data = readData('food-security.json');
  if (!data) return res.status(500).json({ error: 'Food security data unavailable' });
  res.json(data);
});

// ─── Live News ───────────────────────────────────────────────
app.get('/api/news', auth, async (req, res) => {
  try {
    const news = await fetchLiveNews();
    res.json({
      articles: news.slice(0, 15),
      total:    news.length,
      cached:   newsCache.fetchedAt > 0,
      fetchedAt: new Date(newsCache.fetchedAt).toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'News fetch failed', detail: err.message });
  }
});

// ─── Catch-all → SPA ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  WAFEO Digital Twin API — v2.0.0        ║`);
  console.log(`  ║  Running on http://localhost:${PORT}         ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
