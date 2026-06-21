// ════════════════════════════════════════════════════════════
//  WAFEO Digital Twin  EFull Backend Server
//  Node.js / Express  |  All API endpoints + JWT auth
// ════════════════════════════════════════════════════════════

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const jwt      = require('jsonwebtoken');
const compression = require('compression');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const app  = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'wafeo-secret-2024-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '681642080635-fpqmjobr8hnt63adria7qmlk3kar8kej.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ─── CORS  Eallow GitHub Pages frontend ─────────────────────
app.use(cors({
  origin: [
    'https://norbertmuzila.github.io',
    'https://wafeo.vercel.app',
    'https://wafeo-webapplication.vercel.app',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
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

// Firebase Firestore connection
let db;
try {
  const firebase = require('./lib/firebase');
  db = firebase.db;
  console.log('[firebase] Firestore connected');
} catch (err) {
  console.warn('[firebase] Firestore not available, falling back to JSON files:', err.message);
  db = null;
}

// Read data from Firestore first, fall back to JSON files
async function readData(filename) {
  const collectionMap = {
    'users.json': { type: 'collection', name: 'users' },
    'stats.json': { type: 'doc', collection: 'config', docId: 'stats' },
    'alerts.json': { type: 'collection', name: 'alerts' },
    'satellites.json': { type: 'collection', name: 'satellites' },
    'ndvi.json': { type: 'collection', name: 'ndvi' },
    'fields.json': { type: 'collection', name: 'fields' },
    'water.json': { type: 'doc', collection: 'config', docId: 'water' },
    'food-security.json': { type: 'doc', collection: 'config', docId: 'food-security' },
    'countries.json': { type: 'collection', name: 'countries' },
  };
  if (db) {
    try {
      const mapping = collectionMap[filename];
      if (mapping) {
        if (mapping.type === 'collection') {
          const snapshot = await db.collection(mapping.name).get();
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
          const doc = await db.collection(mapping.collection).doc(mapping.docId).get();
          return doc.exists ? doc.data() : null;
        }
      }
    } catch (err) {
      console.warn(`[firebase] Error reading ${filename}, falling back to JSON:`, err.message);
    }
  }
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
  for (const block of blocks) {
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

// ─── NEWS CACHE (15-min TTL  Erefreshes daily content) ─────────
const newsCache = { data: null, fetchedAt: 0, ttl: 15 * 60 * 1000 };
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

  // Run ALL sources in parallel  Eeach is fully independent, failures silently skipped
  await Promise.allSettled([

    // ══ RELIEFWEB POST API (UN OCHA)  E8 themes ════════════════
    rwFetch('Food and Nutrition',           'Food Security', 15).then(r => all.push(...r)).catch(e => console.warn('[rw] food:', e.message)),
    rwFetch('Agriculture',                  'Agriculture',   15).then(r => all.push(...r)).catch(e => console.warn('[rw] agri:', e.message)),
    rwFetch('Water Sanitation Hygiene',     'Water',         15).then(r => all.push(...r)).catch(e => console.warn('[rw] water:', e.message)),
    rwFetch('Disaster Management',          'Disaster',      10).then(r => all.push(...r)).catch(e => console.warn('[rw] disaster:', e.message)),
    rwFetch('Climate Change and Environment','Agriculture',   10).then(r => all.push(...r)).catch(e => console.warn('[rw] climate:', e.message)),
    rwFetch('Drought',                      'Water',         10).then(r => all.push(...r)).catch(e => console.warn('[rw] drought:', e.message)),
    rwFetch('Flood',                        'Disaster',      10).then(r => all.push(...r)).catch(e => console.warn('[rw] flood:', e.message)),
    rwFetch('Food Safety',                  'Food Security', 10).then(r => all.push(...r)).catch(e => console.warn('[rw] foodsafety:', e.message)),

    // ══ REUTERS & BLOOMBERG (Proxy via Google News) ════════════
    fetch('https://news.google.com/rss/search?q=site:reuters.com+(agriculture+OR+food+security+OR+water+scarcity)&hl=en-US&gl=US&ceid=US:en', { headers: HDR, signal: AbortSignal.timeout(10000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'Reuters', 'Global News')))
      .catch(e => console.warn('[rss] reuters:', e.message)),
    fetch('https://news.google.com/rss/search?q=site:bloomberg.com+(agriculture+OR+food+security+OR+water+scarcity)&hl=en-US&gl=US&ceid=US:en', { headers: HDR, signal: AbortSignal.timeout(10000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'Bloomberg', 'Financials')))
      .catch(e => console.warn('[rss] bloomberg:', e.message)),

    // ══ DEVEX (Global Development) ══════════════════════════════
    fetch('https://news.google.com/rss/search?q=site:devex.com+(agriculture+OR+food+security+OR+water)&hl=en-US&gl=US&ceid=US:en', { headers: HDR, signal: AbortSignal.timeout(10000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'Devex', 'Development')))
      .catch(e => console.warn('[rss] devex:', e.message)),

    // ══ CIRCLE OF BLUE & SCIENCEDAILY ══════════════════════════╁E
    fetch('https://www.circleofblue.org/feed/', { headers: HDR, signal: AbortSignal.timeout(10000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'Circle of Blue', 'Water')))
      .catch(e => console.warn('[rss] circleofblue:', e.message)),
    fetch('https://www.sciencedaily.com/rss/earth_climate/agriculture.xml', { headers: HDR, signal: AbortSignal.timeout(10000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'ScienceDaily', 'Research')))
      .catch(e => console.warn('[rss] sd-agri:', e.message)),
    fetch('https://www.sciencedaily.com/rss/earth_climate/water.xml', { headers: HDR, signal: AbortSignal.timeout(10000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'ScienceDaily', 'Water')))
      .catch(e => console.warn('[rss] sd-water:', e.message)),

    // ══ FAO, WFP, UN News ══════════════════════════════════════
    fetch('https://www.fao.org/news/rss-feed/en/', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'FAO', 'Agriculture')))
      .catch(e => console.warn('[rss] fao:', e.message)),
    fetch('https://www.wfp.org/rss/news', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'WFP', 'Food Security')))
      .catch(e => console.warn('[rss] wfp:', e.message)),
    fetch('https://news.un.org/feed/subscribe/en/news/topic/food-and-agriculture/feed.rss', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'UN News', 'Food Security')))
      .catch(e => console.warn('[rss] un-news:', e.message)),

    // ══ NASA & GDACS ══════════════════════════════════════════╁E
    fetch('https://earthobservatory.nasa.gov/feeds/earth-observatory.rss', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'NASA Earth Observatory', 'Water')))
      .catch(e => console.warn('[rss] nasa-eo:', e.message)),
    fetch('https://www.gdacs.org/xml/rss_10.xml', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'GDACS', 'Disaster')))
      .catch(e => console.warn('[rss] gdacs:', e.message)),

    // ══ ADDITIONAL: AgFunderNews & The Guardian ══════════════╁E
    fetch('https://agfundernews.com/feed', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'AgFunder', 'Ag-Tech')))
      .catch(e => console.warn('[rss] agfunder:', e.message)),
    fetch('https://www.theguardian.com/environment/rss', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'The Guardian', 'Environment')))
      .catch(e => console.warn('[rss] guardian:', e.message)),

    // ══ CGIAR, World Bank, IFAD ════════════════════════════════
    fetch('https://www.cgiar.org/feed/', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'CGIAR', 'Agriculture')))
      .catch(e => console.warn('[rss] cgiar:', e.message)),
    fetch('https://blogs.worldbank.org/en/rss?blog=agriculture-and-food', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'World Bank', 'Agriculture')))
      .catch(e => console.warn('[rss] worldbank:', e.message)),
    fetch('https://www.ifad.org/en/rss', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'IFAD', 'Agriculture')))
      .catch(e => console.warn('[rss] ifad:', e.message)),
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

  // ── Guaranteed curated fallback  Ereal articles, news panel never empty ──
  console.warn('[news] All live sources failed  Eserving curated fallback');
  return [
    { title: 'Global Report on Food Crises 2025: 295 Million People in Acute Food Insecurity', url: 'https://www.fao.org/newsroom/detail/global-report-on-food-crises-grfc-2025/en', date: { created: '2025-04-01T00:00:00Z' }, source: [{ name: 'FAO / WFP / FEWS NET' }], country: [{ name: 'Global' }], tag: 'Food Security' },
    { title: 'WFP: Sudan hunger emergency deepens  E24.6 million face acute food insecurity', url: 'https://www.wfp.org/countries/sudan', date: { created: '2025-03-15T00:00:00Z' }, source: [{ name: 'WFP' }], country: [{ name: 'Sudan' }], tag: 'Food Security' },
    { title: 'UN World Water Development Report 2025: Glacier and Groundwater Crisis', url: 'https://www.unwater.org/publications/un-world-water-development-report-2025', date: { created: '2025-03-22T00:00:00Z' }, source: [{ name: 'UN Water / UNESCO' }], country: [{ name: 'Global' }], tag: 'Water' },
    { title: 'East Africa drought: 28 million at risk as La Niña extends dry season into 2025', url: 'https://reliefweb.int/report/kenya/east-africa-drought-2025', date: { created: '2025-02-20T00:00:00Z' }, source: [{ name: 'OCHA' }], country: [{ name: 'Kenya' }, { name: 'Ethiopia' }, { name: 'Somalia' }], tag: 'Water' },
    { title: 'Gaza: 2.1 million face catastrophic food insecurity  EIPC classification', url: 'https://www.ipcinfo.org/ipc-country-analysis/details-map/en/c/1157770/', date: { created: '2025-03-10T00:00:00Z' }, source: [{ name: 'IPC / FAO / WFP' }], country: [{ name: 'Palestine' }], tag: 'Food Security' },
    { title: 'FAO: Global cereal production forecast cut by 1.3% amid climate disruptions', url: 'https://www.fao.org/worldfoodsituation/csdb/en/', date: { created: '2025-03-07T00:00:00Z' }, source: [{ name: 'FAO' }], country: [{ name: 'Global' }], tag: 'Agriculture' },
    { title: 'Copernicus: Record vegetation stress index across Mediterranean croplands in 2025', url: 'https://www.copernicus.eu/en/media/image-day-gallery', date: { created: '2025-02-15T00:00:00Z' }, source: [{ name: 'Copernicus / ESA' }], country: [{ name: 'Mediterranean' }], tag: 'Agriculture' },
    { title: 'Nile Basin water levels at 40-year low  EEgypt and Ethiopia in water dispute', url: 'https://reliefweb.int/report/egypt/nile-basin-water-crisis-2025', date: { created: '2025-01-28T00:00:00Z' }, source: [{ name: 'ReliefWeb / OCHA' }], country: [{ name: 'Egypt' }, { name: 'Ethiopia' }, { name: 'Sudan' }], tag: 'Water' },
    { title: 'NASA GRACE-FO: Groundwater depletion accelerating in North Africa and Arabian Peninsula', url: 'https://earthobservatory.nasa.gov/images/152876/groundwater-decline-north-africa', date: { created: '2025-02-10T00:00:00Z' }, source: [{ name: 'NASA / GRACE-FO' }], country: [{ name: 'North Africa' }, { name: 'Saudi Arabia' }], tag: 'Water' },
    { title: 'CGIAR: Climate-smart rice varieties boost yields by 30% in flood-prone Bangladesh', url: 'https://www.cgiar.org/news-events/news/climate-smart-rice-bangladesh/', date: { created: '2025-02-05T00:00:00Z' }, source: [{ name: 'CGIAR' }], country: [{ name: 'Bangladesh' }], tag: 'Agriculture' },
    { title: 'Myanmar: 13 million face food insecurity as conflict disrupts agriculture', url: 'https://www.wfp.org/countries/myanmar', date: { created: '2025-03-01T00:00:00Z' }, source: [{ name: 'WFP' }], country: [{ name: 'Myanmar' }], tag: 'Food Security' },
    { title: 'World Bank: $2.5 billion fund to support climate-resilient agriculture in Africa', url: 'https://blogs.worldbank.org/en/category/agriculture-and-food', date: { created: '2025-01-20T00:00:00Z' }, source: [{ name: 'World Bank' }], country: [{ name: 'Africa' }], tag: 'Agriculture' },
    { title: 'FAO Desert Locust alert: New breeding grounds detected in East Africa March 2025', url: 'https://www.fao.org/ag/locusts/en/info/info/index.html', date: { created: '2025-03-05T00:00:00Z' }, source: [{ name: 'FAO DLIS' }], country: [{ name: 'Somalia' }, { name: 'Kenya' }, { name: 'Ethiopia' }], tag: 'Agriculture' },
    { title: 'South Sudan: IPC Phase 5 Catastrophe  E74,000 face famine conditions', url: 'https://www.ipcinfo.org/ipc-country-analysis/details-map/en/c/1157066/', date: { created: '2025-02-28T00:00:00Z' }, source: [{ name: 'IPC / FAO' }], country: [{ name: 'South Sudan' }], tag: 'Food Security' },
    { title: 'El Niño to La Niña transition reshapes 2025 rainfall patterns across WAFEO regions', url: 'https://reliefweb.int/report/world/el-nino-la-nina-transition-2025', date: { created: '2025-01-15T00:00:00Z' }, source: [{ name: 'NOAA / WMO' }], country: [{ name: 'Global' }], tag: 'Water' },
    { title: 'IFAD: Smallholder farmers in Sub-Saharan Africa lose $5B annually to soil degradation', url: 'https://www.ifad.org/en/web/latest/news-detail/asset/43030019', date: { created: '2025-02-18T00:00:00Z' }, source: [{ name: 'IFAD' }], country: [{ name: 'Sub-Saharan Africa' }], tag: 'Agriculture' },
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
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = await readData('users.json');
  if (!users) return res.status(500).json({ error: 'User store unavailable' });

  const user = users.find(u =>
    (u.username.toLowerCase() === username.toLowerCase() || 
     (u.email && u.email.toLowerCase() === username.toLowerCase())) && 
    u.password === hashPassword(password)
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
  // Stateless JWT  Eclient discards the token
  res.json({ message: 'Logged out successfully' });
});

// ─── Auth: Google Sign-In ────────────────────────────────────
// ─── Auth: Google Sign-In ────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: 'Google credential (id_token) required' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID, 
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Google email is not verified. Please verify your email first.' });
    }

    const users = await readData('users.json');
    if (!users) return res.status(500).json({ error: 'User store unavailable' });

    let user = users.find(u => u.email && u.email.toLowerCase() === payload.email.toLowerCase());
    
    if (!user) {
      const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
      const newUser = {
        id: maxId + 1,
        username: payload.email.split('@')[0],
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        role: 'researcher', 
        password: '', 
        googleId: payload.sub,
        picture: payload.picture || '',
        authProvider: 'google',
        registeredAt: new Date().toISOString()
      };
      users.push(newUser);
      try {
        if (db) {
          await db.collection('users').doc(String(newUser.id)).set(newUser);
          console.log(`[google-auth] User saved to Firestore: ${newUser.email}`);
        } else {
          fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
        }
      } catch (writeErr) {
        console.error('[google-auth] Failed to persist new user:', writeErr.message);
      }
      user = newUser;
    }

    const jwtToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { password: _pw, ...safeUser } = user;
    res.json({ token: jwtToken, user: safeUser });
    
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google authentication failed. Please try again.' });
  }
});
// ─── Auth: Registration (Email-based) ────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, username, password, region } = req.body || {};
    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required (name, email, username, password)' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const users = await readData('users.json');
    if (!users) return res.status(500).json({ error: 'User store unavailable' });

    if (users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
    const newUser = {
      id: maxId + 1,
      username,
      email,
      name,
      password: hashPassword(password),
      role: 'researcher',
      region: region || 'Global',
      registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    
    if (db) {
      await db.collection('users').doc(String(newUser.id)).set(newUser);
    } else {
      fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
    }

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { password: _pw, ...safeUser } = newUser;
    res.status(201).json({ token, user: safeUser });
  } catch (topErr) {
    console.error('[register] error:', topErr);
    res.status(500).json({ error: 'Registration failed: ' + topErr.message });
  }
});
app.get('/api/admin/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const users = await readData('users.json');
  if (!users) return res.status(500).json({ error: 'User store unavailable' });

  // Return users without passwords
  const safeUsers = users.map(({ password, ...rest }) => rest);
  res.json({ users: safeUsers, total: safeUsers.length });
});

// ─── Dashboard Stats ─────────────────────────────────────────
app.get('/api/dashboard/stats', auth, async (req, res) => {
  const stats = await readData('stats.json');
  if (!stats) return res.status(500).json({ error: 'Stats unavailable' });
  res.json(stats);
});

// ─── Alerts ──────────────────────────────────────────────────
app.get('/api/alerts', auth, async (req, res) => {
  const data = await readData('alerts.json');
  if (!data) return res.status(500).json({ error: 'Alerts unavailable' });
  res.json({ alerts: data, total: data.length });
});

// ─── Satellites ──────────────────────────────────────────────
app.get('/api/satellites', auth, async (req, res) => {
  const data = await readData('satellites.json');
  if (!data) return res.status(500).json({ error: 'Satellite data unavailable' });
  res.json({ satellites: data, count: data.length, lastUpdated: new Date().toISOString() });
});

// ─── NDVI by Region ──────────────────────────────────────────
app.get('/api/analytics/ndvi-by-region', auth, async (req, res) => {
  const data = await readData('ndvi.json');
  if (!data) return res.status(500).json({ error: 'NDVI data unavailable' });
  res.json({ data, source: 'Sentinel-2 / MODIS', updatedAt: new Date().toISOString() });
});

// ─── Fields (Precision Farming) ──────────────────────────────
app.get('/api/fields', auth, async (req, res) => {
  const data = await readData('fields.json');
  if (!data) return res.status(500).json({ error: 'Field data unavailable' });
  res.json({ fields: data, total: data.length });
});

// ─── Water Resources ─────────────────────────────────────────
app.get('/api/water', auth, async (req, res) => {
  const data = await readData('water.json');
  if (!data) return res.status(500).json({ error: 'Water data unavailable' });
  res.json(data);
});

// ─── Food Security ────────────────────────────────────────────
app.get('/api/food-security', auth, async (req, res) => {
  const data = await readData('food-security.json');
  if (!data) return res.status(500).json({ error: 'Food security data unavailable' });
  res.json(data);
});

// ─── Live News ───────────────────────────────────────────────
app.get('/api/news', auth, async (req, res) => {
  try {
    const news = await fetchLiveNews();
    const limit = Number.isFinite(+req.query.limit) ? Math.max(1, +req.query.limit) : null;

    res.json({
      articles: limit ? news.slice(0, limit) : news,
      total:    news.length,
      cached:   newsCache.fetchedAt > 0,
      fetchedAt: new Date(newsCache.fetchedAt).toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'News fetch failed', detail: err.message });
  }
});

// ─── External Satellite Integrations (Config Required) ─────────
app.get('/api/satellite/external/:provider', auth, (req, res) => {
  const provider = req.params.provider.toUpperCase();
  // Protected API Integrations placeholder
  // Systems like PE (Planet), GEE (Google Earth Engine), or SH (Sentinel Hub) require paid/registered API keys
  res.status(403).json({
    error: 'API_KEY_REQUIRED', 
    provider: provider,
    message: `Enterprise API Key configuration is missing for ${provider}. Please update your server environment variables to connect this live stream.`
  });
});

// ─── Catch-all ↁESPA ─────────────────────────────────────────


// ─── Activity Logging ────────────────────────────────────────
app.post('/api/activity/log', auth, async (req, res) => {
  const { action, details } = req.body || {};
  const logEntry = {
    userId: req.user.id,
    username: req.user.username,
    action: action || 'unknown',
    details: details || '',
    timestamp: new Date().toISOString()
  };
  try {
    if (db) {
      await db.collection('activity_logs').add(logEntry);
    }
    res.json({ logged: true });
  } catch (err) {
    console.error('[activity] Log failed:', err.message);
    res.json({ logged: false });
  }
});

// ─── Admin: Get Activity Logs ────────────────────────────────
app.get('/api/admin/activity', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    if (db) {
      const snapshot = await db.collection('activity_logs').orderBy('timestamp', 'desc').limit(100).get();
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ logs, total: logs.length });
    }
    res.json({ logs: [], total: 0, message: 'Firestore not available' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve activity logs' });
  }
});

// ─── AI Assistant (secure Groq proxy — key stays server-side) ─
app.post('/api/ai/chat', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : null;
  if (!messages) return res.status(400).json({ error: 'messages array required' });

  const systemPrompt = {
    role: 'system',
    content: 'You are the WAFEO Digital Twin AI Assistant. You help users interpret Earth Observation data: NDVI vegetation health, water resources, drought, soil and food-security signals across Africa and globally. Be concise, professional and clear. Prefer short paragraphs and bullet points. If asked something outside Earth observation/agriculture/water/food security, answer briefly and steer back to the platform.'
  };
  const finalMessages = messages.some(m => m && m.role === 'system') ? messages : [systemPrompt, ...messages];

  if (!apiKey) {
    return res.status(503).json({
      error: 'AI not configured',
      reply: 'The WAFEO AI assistant is not configured yet. An administrator needs to add a GROQ_API_KEY environment variable in the deployment settings (free tier available at console.groq.com).'
    });
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: finalMessages.slice(-20),
        temperature: 0.5,
        max_tokens: 1024
      })
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error('[ai] Groq error:', r.status, errText.slice(0, 300));
      return res.status(502).json({ error: 'AI provider error', reply: 'Sorry, the AI service returned an error. Please try again shortly.' });
    }
    const data = await r.json();
    const reply = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'No response generated.';
    res.json({ reply });
  } catch (err) {
    console.error('[ai] Request failed:', err.message);
    res.status(502).json({ error: 'AI request failed', reply: 'Sorry, I could not reach the AI service right now.' });
  }
});

// ─── Reports persistence (Firestore) ─────────────────────────
app.post('/api/reports', auth, async (req, res) => {
  const body = req.body || {};
  const report = {
    userId: req.user.id,
    username: req.user.username,
    title: body.title || 'WAFEO Comprehensive Report',
    region: body.region || 'Global',
    summary: body.summary || '',
    sections: Array.isArray(body.sections) ? body.sections : [],
    metrics: body.metrics || {},
    createdAt: new Date().toISOString()
  };
  try {
    if (db) {
      const ref = await db.collection('reports').add(report);
      return res.json({ saved: true, id: ref.id, report });
    }
    res.json({ saved: false, message: 'Firestore not available', report });
  } catch (err) {
    console.error('[reports] Save failed:', err.message);
    res.status(500).json({ saved: false, error: 'Failed to save report' });
  }
});

app.get('/api/reports', auth, async (req, res) => {
  try {
    if (db) {
      const snap = await db.collection('reports').where('userId', '==', req.user.id).limit(50).get();
      let reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      reports.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return res.json({ reports, total: reports.length });
    }
    res.json({ reports: [], total: 0, message: 'Firestore not available' });
  } catch (err) {
    console.error('[reports] List failed:', err.message);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

app.get('/api/seed', async (req, res) => {
  if (req.query.secret !== 'wafeo-admin-seed-2024') return res.status(403).json({ error: 'Unauthorized' });
  const path = require('path');
  const fs = require('fs');
  const dataDir = path.join(__dirname, 'data');
  const arrayCollections = [
    { file: 'users.json', collection: 'users' },
    { file: 'alerts.json', collection: 'alerts' },
    { file: 'satellites.json', collection: 'satellites' },
    { file: 'ndvi.json', collection: 'ndvi' },
    { file: 'fields.json', collection: 'fields' },
    { file: 'countries.json', collection: 'countries' },
  ];
  const singleDocCollections = [
    { file: 'stats.json', collection: 'config', docId: 'stats' },
    { file: 'water.json', collection: 'config', docId: 'water' },
    { file: 'food-security.json', collection: 'config', docId: 'food-security' },
  ];
  const results = [];
  try {
    for (const { file, collection } of arrayCollections) {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      const batch = db.batch();
      const arr = Array.isArray(data) ? data : [data];
      arr.forEach((doc, i) => {
        const id = doc.id ? String(doc.id) : String(i);
        batch.set(db.collection(collection).doc(id), doc);
      });
      await batch.commit();
      results.push("OK: " + collection + " seeded");
    }
    for (const { file, collection, docId } of singleDocCollections) {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      await db.collection(collection).doc(docId).set(data);
      results.push("OK: " + collection + "/" + docId + " seeded");
    }
    res.status(200).json({ success: true, message: 'Database seeded successfully!', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, results });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ╁E WAFEO Digital Twin API  Ev2.0.0        ║`);
  console.log(`  ╁E Running on http://localhost:${PORT}         ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
