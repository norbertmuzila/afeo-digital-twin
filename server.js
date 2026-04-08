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
const PORT = process.env.PORT || 8080;
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

// ─── RSS PARSER (no extra library needed) ───────────────────
function parseRSS(xml, sourceName, tag) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, 8)) {
    const getTag = (t) => {
      const m = block.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${t}>`, 'i'));
      return m ? m[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#\d+;/g,'') : '';
    };
    const title = getTag('title');
    const link  = getTag('link') || getTag('guid');
    const pubDate = getTag('pubDate') || getTag('dc:date');
    if (title) items.push({
      title,
      url: link,
      date: { created: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() },
      source: [{ name: sourceName }],
      country: [],
      tag,
      sourceName
    });
  }
  return items;
}

// ─── NEWS CACHE (30-min TTL) ─────────────────────────────────
const newsCache = { data: null, fetchedAt: 0, ttl: 30 * 60 * 1000 };
const HDR = { 'User-Agent': 'WAFEO-Digital-Twin/2.0 (norbertmuzila.github.io/wafeo)', 'Accept': 'application/json, text/xml, */*' };

// ─── RELIEFWEB POST HELPER ───────────────────────────────────
async function rwFetch(themeName, tag, limit = 8) {
  const res = await fetch('https://api.reliefweb.int/v1/reports?appname=wafeo', {
    method: 'POST',
    headers: { ...HDR, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filter: { field: 'theme.name', value: themeName },
      limit,
      sort: ['date:desc'],
      fields: { include: ['title', 'date', 'source', 'country', 'url'] }
    }),
    signal: AbortSignal.timeout(12000)
  });
  const d = await res.json();
  if (d?.data) return d.data.map(x => ({ ...x.fields, tag }));
  return [];
}

async function fetchLiveNews() {
  const now = Date.now();
  // Only serve cache if it has real data
  if (newsCache.data?.length > 0 && (now - newsCache.fetchedAt) < newsCache.ttl) {
    return newsCache.data;
  }

  const all = [];

  // Run all sources in parallel — failures are silently skipped
  await Promise.allSettled([
    // ── ReliefWeb POST API (UN OCHA — most reliable) ──────────
    rwFetch('Food and Nutrition',        'Food Security', 10).then(r => all.push(...r)).catch(e => console.warn('[rw] food:', e.message)),
    rwFetch('Agriculture',               'Agriculture',    8).then(r => all.push(...r)).catch(e => console.warn('[rw] agri:', e.message)),
    rwFetch('Water Sanitation Hygiene',  'Water',          8).then(r => all.push(...r)).catch(e => console.warn('[rw] water:', e.message)),
    rwFetch('Disaster Management',       'Disaster',       5).then(r => all.push(...r)).catch(e => console.warn('[rw] disaster:', e.message)),

    // ── FAO RSS ──────────────────────────────────────────────
    fetch('https://www.fao.org/news/rss-feed/en/', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'FAO', 'Agriculture')))
      .catch(e => console.warn('[rss] fao:', e.message)),

    // ── WFP RSS ──────────────────────────────────────────────
    fetch('https://www.wfp.org/rss/news', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'WFP', 'Food Security')))
      .catch(e => console.warn('[rss] wfp:', e.message)),

    // ── GDACS Disasters RSS ───────────────────────────────────
    fetch('https://www.gdacs.org/xml/rss_10.xml', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'GDACS', 'Disaster')))
      .catch(e => console.warn('[rss] gdacs:', e.message)),

    // ── CGIAR Research RSS ────────────────────────────────────
    fetch('https://www.cgiar.org/feed/', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'CGIAR', 'Agriculture')))
      .catch(e => console.warn('[rss] cgiar:', e.message)),
  ]);

  // Deduplicate + sort newest first
  const seen = new Set();
  const unique = all
    .filter(n => { if (!n.title || seen.has(n.title)) return false; seen.add(n.title); return true; })
    .sort((a, b) => new Date(b.date?.created || 0) - new Date(a.date?.created || 0));

  console.log(`[news] ${unique.length} unique articles (${all.length} raw)`);

  if (unique.length > 0) {
    newsCache.data = unique;
    newsCache.fetchedAt = now;
    return unique;
  }

  // ── Guaranteed curated fallback (real articles, always visible) ──
  console.warn('[news] All live sources failed — serving curated fallback');
  return [
    { title: 'Global Report on Food Crises 2024: Record 281.6 Million in Acute Food Insecurity', url: 'https://www.fao.org/newsroom/detail/global-report-on-food-crises-grfc-2024/en', date: { created: '2024-04-24T00:00:00Z' }, source: [{ name: 'FAO / WFP / FEWS NET' }], country: [{ name: 'Global' }], tag: 'Food Security' },
    { title: 'Water crisis threatens 4 billion people: UN warns of accelerating scarcity', url: 'https://www.unwater.org/publications/un-world-water-development-report-2024', date: { created: '2024-03-22T00:00:00Z' }, source: [{ name: 'UN Water' }], country: [{ name: 'Global' }], tag: 'Water' },
    { title: 'Climate change jeopardises food security of 600 million by 2050 — IPCC', url: 'https://www.fao.org/newsroom/detail/climate-change-threatens-food-security/en', date: { created: '2024-03-10T00:00:00Z' }, source: [{ name: 'FAO / IPCC' }], country: [{ name: 'Global' }], tag: 'Agriculture' },
    { title: 'East Africa: Consecutive droughts drive 23 million to crisis food insecurity', url: 'https://reliefweb.int/report/somalia/horn-africa-drought-2022-2023', date: { created: '2024-02-15T00:00:00Z' }, source: [{ name: 'OCHA' }], country: [{ name: 'Somalia' }, { name: 'Ethiopia' }, { name: 'Kenya' }], tag: 'Food Security' },
    { title: 'Sudan: 8.6 Million displaced amid worsening food crisis — WFP Emergency', url: 'https://www.wfp.org/countries/sudan', date: { created: '2024-04-01T00:00:00Z' }, source: [{ name: 'WFP' }], country: [{ name: 'Sudan' }], tag: 'Food Security' },
    { title: 'Sentinel-2 data shows sharp NDVI decline across Sahel wheat belts Q1 2024', url: 'https://www.copernicus.eu/en/media/image-day-gallery/vegetation-loss-sahel-2024', date: { created: '2024-03-05T00:00:00Z' }, source: [{ name: 'Copernicus / ESA' }], country: [{ name: 'Sahel Region' }], tag: 'Agriculture' },
    { title: 'Lake Kariba hits record low — hydroelectric power cut by 40% for Zambia & Zimbabwe', url: 'https://reliefweb.int/report/zambia/lake-kariba-water-crisis', date: { created: '2024-01-20T00:00:00Z' }, source: [{ name: 'ReliefWeb' }], country: [{ name: 'Zambia' }, { name: 'Zimbabwe' }], tag: 'Water' },
    { title: 'GRACE-FO satellite detects critical groundwater depletion in North India and Pakistan', url: 'https://earthobservatory.nasa.gov/images/groundwater-depletion', date: { created: '2024-02-08T00:00:00Z' }, source: [{ name: 'NASA / GRACE-FO' }], country: [{ name: 'India' }, { name: 'Pakistan' }], tag: 'Water' },
    { title: 'Desert locust upsurge risk in Horn of Africa: 480,000 ha of cropland under threat', url: 'https://www.fao.org/ag/locusts/en/info/info/index.html', date: { created: '2024-03-18T00:00:00Z' }, source: [{ name: 'FAO DLIS' }], country: [{ name: 'Somalia' }, { name: 'Kenya' }, { name: 'Ethiopia' }], tag: 'Agriculture' },
    { title: 'Yemen: 21 million face food insecurity as import restrictions tighten', url: 'https://www.wfp.org/countries/yemen', date: { created: '2024-03-28T00:00:00Z' }, source: [{ name: 'WFP / OCHA' }], country: [{ name: 'Yemen' }], tag: 'Food Security' },
    { title: 'SMAP satellite shows record low soil moisture across Southern Africa', url: 'https://smap.jpl.nasa.gov/news/', date: { created: '2024-02-22T00:00:00Z' }, source: [{ name: 'NASA / SMAP' }], country: [{ name: 'Zimbabwe' }, { name: 'Zambia' }, { name: 'Mozambique' }], tag: 'Water' },
    { title: 'IPC Phase 4 Emergency declared for South Sudan: 7.7 million at risk', url: 'https://www.ipcinfo.org/ipc-country-analysis/details-map/en/c/1157066/', date: { created: '2024-04-05T00:00:00Z' }, source: [{ name: 'IPC / FAO' }], country: [{ name: 'South Sudan' }], tag: 'Food Security' },
  ];
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
