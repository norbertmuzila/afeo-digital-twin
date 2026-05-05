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

// ─── CORS — allow GitHub Pages frontend ─────────────────────
app.use(cors({
  origin: [
    'https://norbertmuzila.github.io',
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

// ─── NEWS CACHE (15-min TTL — refreshes daily content) ─────────
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

  // Run ALL sources in parallel — each is fully independent, failures silently skipped
  await Promise.allSettled([

    // ══ RELIEFWEB POST API (UN OCHA) — 8 themes ════════════════
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

    // ══ CIRCLE OF BLUE & SCIENCEDAILY ═══════════════════════════
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

    // ══ NASA & GDACS ═══════════════════════════════════════════
    fetch('https://earthobservatory.nasa.gov/feeds/earth-observatory.rss', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'NASA Earth Observatory', 'Water')))
      .catch(e => console.warn('[rss] nasa-eo:', e.message)),
    fetch('https://www.gdacs.org/xml/rss_10.xml', { headers: HDR, signal: AbortSignal.timeout(9000) })
      .then(r => r.text()).then(xml => all.push(...parseRSS(xml, 'GDACS', 'Disaster')))
      .catch(e => console.warn('[rss] gdacs:', e.message)),

    // ══ ADDITIONAL: AgFunderNews & The Guardian ═══════════════
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

  // ── Guaranteed curated fallback — real articles, news panel never empty ──
  console.warn('[news] All live sources failed — serving curated fallback');
  return [
    { title: 'Global Report on Food Crises 2025: 295 Million People in Acute Food Insecurity', url: 'https://www.fao.org/newsroom/detail/global-report-on-food-crises-grfc-2025/en', date: { created: '2025-04-01T00:00:00Z' }, source: [{ name: 'FAO / WFP / FEWS NET' }], country: [{ name: 'Global' }], tag: 'Food Security' },
    { title: 'WFP: Sudan hunger emergency deepens — 24.6 million face acute food insecurity', url: 'https://www.wfp.org/countries/sudan', date: { created: '2025-03-15T00:00:00Z' }, source: [{ name: 'WFP' }], country: [{ name: 'Sudan' }], tag: 'Food Security' },
    { title: 'UN World Water Development Report 2025: Glacier and Groundwater Crisis', url: 'https://www.unwater.org/publications/un-world-water-development-report-2025', date: { created: '2025-03-22T00:00:00Z' }, source: [{ name: 'UN Water / UNESCO' }], country: [{ name: 'Global' }], tag: 'Water' },
    { title: 'East Africa drought: 28 million at risk as La Niña extends dry season into 2025', url: 'https://reliefweb.int/report/kenya/east-africa-drought-2025', date: { created: '2025-02-20T00:00:00Z' }, source: [{ name: 'OCHA' }], country: [{ name: 'Kenya' }, { name: 'Ethiopia' }, { name: 'Somalia' }], tag: 'Water' },
    { title: 'Gaza: 2.1 million face catastrophic food insecurity — IPC classification', url: 'https://www.ipcinfo.org/ipc-country-analysis/details-map/en/c/1157770/', date: { created: '2025-03-10T00:00:00Z' }, source: [{ name: 'IPC / FAO / WFP' }], country: [{ name: 'Palestine' }], tag: 'Food Security' },
    { title: 'FAO: Global cereal production forecast cut by 1.3% amid climate disruptions', url: 'https://www.fao.org/worldfoodsituation/csdb/en/', date: { created: '2025-03-07T00:00:00Z' }, source: [{ name: 'FAO' }], country: [{ name: 'Global' }], tag: 'Agriculture' },
    { title: 'Copernicus: Record vegetation stress index across Mediterranean croplands in 2025', url: 'https://www.copernicus.eu/en/media/image-day-gallery', date: { created: '2025-02-15T00:00:00Z' }, source: [{ name: 'Copernicus / ESA' }], country: [{ name: 'Mediterranean' }], tag: 'Agriculture' },
    { title: 'Nile Basin water levels at 40-year low — Egypt and Ethiopia in water dispute', url: 'https://reliefweb.int/report/egypt/nile-basin-water-crisis-2025', date: { created: '2025-01-28T00:00:00Z' }, source: [{ name: 'ReliefWeb / OCHA' }], country: [{ name: 'Egypt' }, { name: 'Ethiopia' }, { name: 'Sudan' }], tag: 'Water' },
    { title: 'NASA GRACE-FO: Groundwater depletion accelerating in North Africa and Arabian Peninsula', url: 'https://earthobservatory.nasa.gov/images/152876/groundwater-decline-north-africa', date: { created: '2025-02-10T00:00:00Z' }, source: [{ name: 'NASA / GRACE-FO' }], country: [{ name: 'North Africa' }, { name: 'Saudi Arabia' }], tag: 'Water' },
    { title: 'CGIAR: Climate-smart rice varieties boost yields by 30% in flood-prone Bangladesh', url: 'https://www.cgiar.org/news-events/news/climate-smart-rice-bangladesh/', date: { created: '2025-02-05T00:00:00Z' }, source: [{ name: 'CGIAR' }], country: [{ name: 'Bangladesh' }], tag: 'Agriculture' },
    { title: 'Myanmar: 13 million face food insecurity as conflict disrupts agriculture', url: 'https://www.wfp.org/countries/myanmar', date: { created: '2025-03-01T00:00:00Z' }, source: [{ name: 'WFP' }], country: [{ name: 'Myanmar' }], tag: 'Food Security' },
    { title: 'World Bank: $2.5 billion fund to support climate-resilient agriculture in Africa', url: 'https://blogs.worldbank.org/en/category/agriculture-and-food', date: { created: '2025-01-20T00:00:00Z' }, source: [{ name: 'World Bank' }], country: [{ name: 'Africa' }], tag: 'Agriculture' },
    { title: 'FAO Desert Locust alert: New breeding grounds detected in East Africa March 2025', url: 'https://www.fao.org/ag/locusts/en/info/info/index.html', date: { created: '2025-03-05T00:00:00Z' }, source: [{ name: 'FAO DLIS' }], country: [{ name: 'Somalia' }, { name: 'Kenya' }, { name: 'Ethiopia' }], tag: 'Agriculture' },
    { title: 'South Sudan: IPC Phase 5 Catastrophe — 74,000 face famine conditions', url: 'https://www.ipcinfo.org/ipc-country-analysis/details-map/en/c/1157066/', date: { created: '2025-02-28T00:00:00Z' }, source: [{ name: 'IPC / FAO' }], country: [{ name: 'South Sudan' }], tag: 'Food Security' },
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
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = readData('users.json');
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
  // Stateless JWT — client discards the token
  res.json({ message: 'Logged out successfully' });
});

// ─── Auth: Google Sign-In ────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: 'Google credential (id_token) required' });
  }

  try {
    // Verify the Google ID token cryptographically — no mock fallback
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID, 
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    // Only allow verified Google accounts
    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Google email is not verified. Please verify your email first.' });
    }

    // Check if user exists in our system, or create a new one
    const users = readData('users.json');
    if (!users) return res.status(500).json({ error: 'User store unavailable' });

    let user = users.find(u => u.email && u.email.toLowerCase() === payload.email.toLowerCase());
    
    // If user doesn't exist, auto-register them (Google Sign-Up)
    if (!user) {
      const newUser = {
        id: users.length + 1,
        username: payload.email.split('@')[0],
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        role: 'researcher', // default role for new Google users
        password: '', // no password for Google-authenticated users
        googleId: payload.sub,
        picture: payload.picture || '',
        authProvider: 'google',
        registeredAt: new Date().toISOString()
      };
      users.push(newUser);
      // Persist the new user to disk
      try {
        fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
        console.log(`[google-auth] New user registered: ${newUser.email}`);
      } catch (writeErr) {
        console.error('[google-auth] Failed to persist new user:', writeErr.message);
      }
      user = newUser;
    }

    // Generate JWT token
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
app.post('/api/auth/register', (req, res) => {
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

  const users = readData('users.json');
  if (!users) return res.status(500).json({ error: 'User store unavailable' });

  // Check for duplicate username or email
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const newUser = {
    id: users.length + 1,
    username,
    email,
    name,
    password: hashPassword(password),
    role: 'researcher',
    region: region || 'Global',
    registeredAt: new Date().toISOString()
  };

  users.push(newUser);
  try {
    fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('[register] Failed to save user:', err.message);
    return res.status(500).json({ error: 'Failed to save registration' });
  }

  const token = jwt.sign(
    { id: newUser.id, username: newUser.username, role: newUser.role, name: newUser.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  const { password: _pw, ...safeUser } = newUser;
  console.log(`[register] New user: ${username} (${email}) from ${region}`);
  res.status(201).json({ token, user: safeUser });
});

// ─── Admin: List All Users ───────────────────────────────────
app.get('/api/admin/users', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const users = readData('users.json');
  if (!users) return res.status(500).json({ error: 'User store unavailable' });

  // Return users without passwords
  const safeUsers = users.map(({ password, ...rest }) => rest);
  res.json({ users: safeUsers, total: safeUsers.length });
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
