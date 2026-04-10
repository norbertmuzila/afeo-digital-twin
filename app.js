// ════════════════════════════════════════
//  WAFEO Platform — Frontend Application
// ════════════════════════════════════════

const API = 'https://wafeo.up.railway.app/api';
let authToken = null;
let currentUser = null;

// (Login particles and globe canvas removed for clean EMHARE theme)

// ─── AUTH ───
document.getElementById('btnLogin').addEventListener('click', doLogin);
document.getElementById('inPass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

// Initialize Google Sign-In
// Initialize Google Sign-In
function handleGoogleCredentialResponse(response) {
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');
  
  // Send ID token to backend for verification
  fetch(API + '/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: response.credential })
  })
  .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, body: data })))
  .then(({ status, ok, body }) => {
    if (!ok) { 
      errEl.textContent = body.error || 'Google sign-in failed. Please try again.';
      errEl.classList.add('show'); 
      return; 
    }
    
    authToken = body.token;
    currentUser = body.user;
    document.getElementById('sbName').textContent = body.user.name;
    document.getElementById('sbRole').textContent = body.user.role.charAt(0).toUpperCase() + body.user.role.slice(1);
    document.getElementById('sbAvatar').textContent = body.user.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    
    document.getElementById('loginScreen').classList.add('out');
    setTimeout(() => { document.getElementById('appShell').classList.add('on'); }, 400);
    loadDashboard();
    initMapOnce();
  })
  .catch(err => {
    console.error('Google sign-in error:', err);
    errEl.textContent = 'Cannot connect to server. Please check your connection.';
    errEl.classList.add('show');
  });
}

function initGoogleSignIn() {
  const googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
  
  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true
  });

  google.accounts.id.renderButton(
    document.getElementById("googleButtonContainer"),
    { theme: "outline", size: "large", width: 330, text: "signin_with" }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  // Wait a small moment to ensure google library is loaded if deferred
  const checkGoogle = setInterval(() => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      clearInterval(checkGoogle);
      initGoogleSignIn();
    }
  }, 100);
});

const aiFabBtn = document.getElementById('aiFabBtn');
const aiWidgetPanel = document.getElementById('aiWidgetPanel');
const aiCloseBtn = document.getElementById('aiCloseBtn');
const aiInput = document.getElementById('aiInput');

if (aiFabBtn && aiWidgetPanel && aiCloseBtn) {
  aiFabBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = aiWidgetPanel.style.display === 'flex' ? 'none' : 'flex';
    if (aiWidgetPanel.style.display === 'flex') aiInput.focus();
  });
  aiCloseBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = 'none';
  });
}

async function doLogin() {

  const username = document.getElementById('inUser').value.trim();
  const password = document.getElementById('inPass').value;
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');

  if (!username || !password) {
    errEl.textContent = 'Please enter your username and password.';
    errEl.classList.add('show');
    return;
  }

  try {
    const res = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Invalid credentials. Please try again.'; errEl.classList.add('show'); return; }

    authToken = data.token;
    currentUser = data.user;
    document.getElementById('sbName').textContent = data.user.name;
    document.getElementById('sbRole').textContent = data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1);
    document.getElementById('sbAvatar').textContent = data.user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    document.getElementById('loginScreen').classList.add('out');
    setTimeout(() => { document.getElementById('appShell').classList.add('on'); }, 400);
    loadDashboard();
    initMapOnce();
  } catch (err) {
    errEl.textContent = 'Cannot connect to server. Please check your connection and try again.';
    errEl.classList.add('show');
  }
}

function doLogout() {
  if (authToken) fetch(API + '/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken } });
  authToken = null; currentUser = null;
  document.getElementById('appShell').classList.remove('on');
  setTimeout(() => { document.getElementById('loginScreen').classList.remove('out'); }, 400);
}

// ─── NAV & THEME ───
const themeToggleBtn = document.getElementById('themeToggle');
if(themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light') {
      document.documentElement.removeAttribute('data-theme');
      themeToggleBtn.textContent = '🌙';
      if(map) map.removeLayer(tileLayer);
      if(map) tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB' }).addTo(map);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggleBtn.textContent = '☀️';
      if(map) map.removeLayer(tileLayer);
      if(map) tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB' }).addTo(map);
    }
  });
}

const titleMap = {
  'dashboard':'Dashboard', 'world-map':'World Map — Digital Twin', 'precision-farming':'Precision Farming',
  'crop-monitoring':'Crop Monitoring', 'soil-analysis':'Soil Analysis', 'water-resources':'Water Resources',
  'drought-monitor':'Drought Monitor', 'food-security':'Food Security Index', 'early-warning':'Early Warning',
  'reports':'Reports & Analytics', 'settings':'Settings'
};
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    link.classList.add('active');
    const pg = link.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('pg-' + pg);
    if (el) el.classList.add('active');
    document.getElementById('pgTitle').textContent = titleMap[pg] || pg;
    document.getElementById('pgCrumb').textContent = 'WAFEO / ' + (titleMap[pg] || pg);
    if (pg === 'world-map') initMapOnce();
    if (pg === 'precision-farming') loadFields();
    if (pg === 'water-resources') loadWater();
    if (pg === 'food-security') loadFood();
  });
});

// Tab buttons
document.querySelectorAll('.tab-bar').forEach(bar => {
  bar.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

// ─── FETCH HELPER ───
async function apiFetch(path) {
  try {
    const h = authToken ? { 'Authorization': 'Bearer ' + authToken } : {};
    const res = await fetch(API + path, { headers: h });
    return await res.json();
  } catch { return null; }
}

// ─── DASHBOARD ───
async function loadDashboard() {
  const [stats, alerts, sats, ndvi, news] = await Promise.all([
    apiFetch('/dashboard/stats'),
    apiFetch('/alerts'),
    apiFetch('/satellites'),
    apiFetch('/analytics/ndvi-by-region'),
    apiFetch('/news')
  ]);

  if (stats) renderStats(stats);
  if (alerts) renderAlerts(alerts.alerts);
  if (sats) renderSatellites(sats.satellites);
  if (ndvi) renderNDVIChart(ndvi.data);
  if (news) renderNewsPanel(news.articles);
  renderWaterGauges();
  renderFoodQuick();
}

let _cachedNews = [];

// ─── NEWS PANEL RENDERER ─────────────────────────────────────
function renderNewsPanel(articles) {
  const panel = document.getElementById('newsPanel');
  if (!panel) return;

  _cachedNews = articles || []; // Store for filtering

  if (!articles || articles.length === 0) {
    panel.innerHTML = '<div class="panel-hdr"><h3>📰 Live News</h3><span class="panel-badge">No data</span></div><div style="padding:16px;font-size:13px;color:var(--text-muted)">No news articles available right now.</div>';
    return;
  }

  const tagColors = {
    'Food Security': '#e53e3e', 'Agriculture': '#38a169', 'Water': '#3182ce',
    'Disaster': '#d69e2e', 'Global News': '#003366', 'Financials': '#4a5568',
    'Development': '#805ad5', 'Research': '#319795', 'Ag-Tech': '#2b6cb0',
    'Environment': '#276749'
  };

  const renderItems = (list) => {
    if (!list || list.length === 0) return '<div style="padding:16px;font-size:13px;color:var(--text-muted)">No matching articles found.</div>';
    return list.map(a => {
      const date = a.date?.created ? new Date(a.date.created).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : 'Today';
      const source = a.source && a.source.length > 0 ? a.source[0].name : (a.sourceName || 'Global');
      const countries = a.country && a.country.length > 0 ? a.country.map(c => c.name).slice(0,3).join(', ') : 'Global';
      const tc = tagColors[a.tag] || '#3182ce';
      return `<div class="news-item" style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start">
        <div style="flex-shrink:0;margin-top:3px"><span style="background:${tc};color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;white-space:nowrap">${a.tag || 'News'}</span></div>
        <div style="flex:1;min-width:0">
          <a href="${a.url || '#'}" target="_blank" rel="noopener" style="font-weight:600;color:var(--text-primary);font-size:13px;text-decoration:none;display:block;margin-bottom:3px;line-height:1.35;transition:color .2s" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-primary)'">${a.title}</a>
          <div style="font-size:10px;color:var(--text-muted)">📍 ${countries} &nbsp;·&nbsp; 🏢 ${source} &nbsp;·&nbsp; 📅 ${date}</div>
        </div>
      </div>`;
    }).join('');
  };

  panel.innerHTML = `
    <div class="panel-hdr" style="flex-wrap: wrap; gap: 10px;">
      <h3 style="flex-shrink: 0;">📰 Live News — Water, Agriculture &amp; Food Systems</h3>
      <div class="news-search-box">
        <input type="text" id="newsQuery" placeholder="Search keywords..." oninput="handleNewsSearch(event)">
      </div>
      <span class="panel-badge" id="newsCount" style="background:var(--accent-blue)">${articles.length} Reports</span>
    </div>
    <div class="panel-scroll-content" id="newsList">
      ${renderItems(articles)}
    </div>
  `;
}

function handleNewsSearch(e) {
  const query = e.target.value.toLowerCase();
  const filtered = _cachedNews.filter(a => {
    const title = (a.title || '').toLowerCase();
    const source = (a.sourceName || (a.source && a.source[0] ? a.source[0].name : '')).toLowerCase();
    const countries = (a.country ? a.country.map(c => c.name).join(' ') : '').toLowerCase();
    return title.includes(query) || source.includes(query) || countries.includes(query);
  });

  const listContainer = document.getElementById('newsList');
  const countBadge = document.getElementById('newsCount');

  if (listContainer) {
    // Re-render only the list items to maintain input focus
    const tagColors = {
      'Food Security': '#e53e3e', 'Agriculture': '#38a169', 'Water': '#3182ce',
      'Disaster': '#d69e2e', 'Global News': '#003366', 'Financials': '#4a5568',
      'Development': '#805ad5', 'Research': '#319795', 'Ag-Tech': '#2b6cb0',
      'Environment': '#276749'
    };
    
    listContainer.innerHTML = filtered.map(a => {
      const date = a.date?.created ? new Date(a.date.created).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : 'Today';
      const source = a.source && a.source.length > 0 ? a.source[0].name : (a.sourceName || 'Global');
      const countries = a.country && a.country.length > 0 ? a.country.map(c => c.name).slice(0,3).join(', ') : 'Global';
      const tc = tagColors[a.tag] || '#3182ce';
      return `<div class="news-item" style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start">
        <div style="flex-shrink:0;margin-top:3px"><span style="background:${tc};color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;white-space:nowrap">${a.tag || 'News'}</span></div>
        <div style="flex:1;min-width:0">
          <a href="${a.url || '#'}" target="_blank" rel="noopener" style="font-weight:600;color:var(--text-primary);font-size:13px;text-decoration:none;display:block;margin-bottom:3px;line-height:1.35;transition:color .2s" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-primary)'">${a.title}</a>
          <div style="font-size:10px;color:var(--text-muted)">📍 ${countries} &nbsp;·&nbsp; 🏢 ${source} &nbsp;·&nbsp; 📅 ${date}</div>
        </div>
      </div>`;
    }).join('') || '<div style="padding:16px;font-size:13px;color:var(--text-muted)">No matching articles found.</div>';
  }

  if (countBadge) {
    countBadge.textContent = `${filtered.length} Reports`;
  }
}



function renderStats(s) {
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="sc-icon g">🌾</div><div class="sc-label">Global Crop Health</div><div class="sc-value" style="color:var(--accent-green)">${s.cropHealth.value}</div><div class="sc-change up">${s.cropHealth.change}</div></div>
    <div class="stat-card"><div class="sc-icon b">💧</div><div class="sc-label">Water Availability</div><div class="sc-value" style="color:var(--accent-blue)">${s.waterScore.value}</div><div class="sc-change dn">${s.waterScore.change}</div></div>
    <div class="stat-card"><div class="sc-icon a">🛡️</div><div class="sc-label">Food Security Alerts</div><div class="sc-value" style="color:var(--accent-amber)">${s.foodAlerts.value}</div><div class="sc-change neut">${s.foodAlerts.change}</div></div>
    <div class="stat-card"><div class="sc-icon c">🛰️</div><div class="sc-label">Active Satellites</div><div class="sc-value" style="color:var(--accent-cyan)">${s.satellites.value}</div><div class="sc-change neut">${s.satellites.change}</div></div>
  `;
}

function renderAlerts(alerts) {
  const icons = { critical:'🔴', warning:'🟡', info:'🔵' };
  const html = alerts.slice(0, 5).map(a => `
    <div class="alert-card ${a.severity}">
      <div class="ac-icon">${icons[a.severity]}</div>
      <div class="ac-body">
        <div class="ac-title">${a.title}</div>
        <div class="ac-desc">${a.desc}</div>
        <div class="ac-meta">${a.source} · ${timeAgo(a.timestamp)}</div>
      </div>
    </div>
  `).join('');
  document.getElementById('alertsPanel').innerHTML = `<div class="panel-hdr"><h3>⚠️ Active Alerts</h3><span class="panel-badge">${alerts.length} Active</span></div>${html}`;
}

function renderNDVIChart(data) {
  const ndviColors = v => v>=0.7?'#1a9850':v>=0.55?'#91cf60':v>=0.4?'#d9ef8b':v>=0.3?'#fee08b':v>=0.2?'#fc8d59':'#d73027';
  const bars = data.map(d => `<div class="bar-col"><div class="bar-val">${d.ndvi}</div><div class="bar" style="height:${d.ndvi*220}px;background:${ndviColors(d.ndvi)}"></div><div class="bar-lbl">${d.region.replace('North ','N. ').replace('South ','S. ').replace('Southeast ','SE ')}</div></div>`).join('');
  document.getElementById('ndviPanel').innerHTML = `<div class="panel-hdr"><h3>🌾 Regional Crop Health (NDVI)</h3><span class="panel-badge">Sentinel-2</span></div><div class="bar-chart">${bars}</div><div class="ndvi-gradient"></div><div class="ndvi-labels"><span>Bare</span><span>Stressed</span><span>Moderate</span><span>Healthy</span><span>Very Healthy</span></div>`;
}

function renderWaterGauges() {
  document.getElementById('waterPanel').innerHTML = `
    <div class="panel-hdr"><h3>💧 Water Resources</h3><span class="panel-badge">GRACE-FO</span></div>
    <div class="gauge-row">
      <div class="gauge-item"><label><span>Global Reservoir Levels</span><span>67%</span></label><div class="gauge-track"><div class="gauge-fill water" style="width:67%"></div></div></div>
      <div class="gauge-item"><label><span>Groundwater Index</span><span>54%</span></label><div class="gauge-track"><div class="gauge-fill mixed" style="width:54%"></div></div></div>
      <div class="gauge-item"><label><span>Rainfall Anomaly (30d)</span><span style="color:var(--accent-red)">−18%</span></label><div class="gauge-track"><div class="gauge-fill low" style="width:38%"></div></div></div>
      <div class="gauge-item"><label><span>Snow Water Equivalent</span><span>81%</span></label><div class="gauge-track"><div class="gauge-fill high" style="width:81%"></div></div></div>
    </div>`;
}

function renderFoodQuick() {
  const rows = [
    ['🇸🇴 Somalia','Phase 4','4.2M','▲ Worsening','crit','var(--accent-red)'],
    ['🇸🇩 Sudan','Phase 4','6.1M','▲ Worsening','crit','var(--accent-red)'],
    ['🇪🇹 Ethiopia','Phase 3','3.8M','→ Stable','warn','var(--accent-amber)'],
    ['🇦🇫 Afghanistan','Phase 3','5.5M','▼ Improving','warn','var(--accent-green)'],
    ['🇭🇹 Haiti','Phase 3','1.8M','→ Stable','warn','var(--accent-amber)'],
    ['🇲🇬 Madagascar','Phase 2','1.3M','▼ Improving','info','var(--accent-green)'],
  ];
  const tbody = rows.map(r => `<tr><td>${r[0]}</td><td><span class="pill ${r[4]}">${r[1]}</span></td><td class="mono">${r[2]}</td><td style="color:${r[5]}">${r[3]}</td></tr>`).join('');
  document.getElementById('foodPanel').innerHTML = `<div class="panel-hdr"><h3>🛡️ Food Security Watch</h3><span class="panel-badge">IPC</span></div><table class="dtable"><thead><tr><th>Region</th><th>Phase</th><th>Pop.</th><th>Trend</th></tr></thead><tbody>${tbody}</tbody></table>`;
}

function renderSatellites(sats) {
  const tbody = sats.map(s => `<tr><td>${s.name}</td><td>${s.agency}</td><td class="mono">${s.passTime}</td><td>${s.coverage}</td><td>${s.resolution}</td><td>${s.dataType}</td><td><span class="pill ${s.status==='active'?'ok':'info'}">● ${s.status.charAt(0).toUpperCase()+s.status.slice(1)}</span></td></tr>`).join('');
  document.getElementById('satPanel').innerHTML = `<div class="panel-hdr"><h3>🛰️ Satellite Coverage — Next 24h</h3><span class="panel-badge">${sats.length} Passes</span></div><table class="dtable"><thead><tr><th>Satellite</th><th>Agency</th><th>Pass (UTC)</th><th>Coverage</th><th>Res.</th><th>Data</th><th>Status</th></tr></thead><tbody>${tbody}</tbody></table>`;
}

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if(d<3600000) return Math.floor(d/60000)+'m ago';
  if(d<86400000) return Math.floor(d/3600000)+'h ago';
  return Math.floor(d/86400000)+'d ago';
}

// ─── FIELDS ───
async function loadFields() {
  const data = await apiFetch('/fields');
  if (!data) return loadFieldsDemo();
  renderFields(data.fields);
}
function loadFieldsDemo() {
  renderFields([
    {name:'Field Alpha',crop:'Wheat',ndvi:0.82,soilMoisture:34,yieldEst:4.2,area:120,status:'healthy'},
    {name:'Field Beta',crop:'Maize',ndvi:0.51,soilMoisture:18,yieldEst:2.8,area:85,status:'stressed'},
    {name:'Field Gamma',crop:'Rice',ndvi:0.76,soilMoisture:62,yieldEst:5.1,area:200,status:'healthy'},
    {name:'Field Delta',crop:'Soybean',ndvi:0.28,soilMoisture:9,yieldEst:0.8,area:65,status:'critical'},
    {name:'Field Epsilon',crop:'Coffee',ndvi:0.89,soilMoisture:45,yieldEst:2.1,area:40,status:'healthy'},
    {name:'Field Zeta',crop:'Groundnut',ndvi:0.46,soilMoisture:22,yieldEst:1.4,area:55,status:'stressed'},
  ]);
}
const cropEmoji = { Wheat:'🌾', Maize:'🌽', Rice:'🍚', Soybean:'🫘', Coffee:'☕', Groundnut:'🥜', Tobacco:'🍂', Sorghum:'🌿' };
function ndviColor(v) { return v>=0.7?'#1a9850':v>=0.55?'#91cf60':v>=0.4?'#d9ef8b':v>=0.3?'#fee08b':v>=0.2?'#fc8d59':'#d73027'; }
function ndviGrad(v) { return v>=0.7?'linear-gradient(90deg,#91cf60,#1a9850)':v>=0.5?'linear-gradient(90deg,#d9ef8b,#91cf60)':v>=0.3?'linear-gradient(90deg,#fee08b,#fc8d59)':'linear-gradient(90deg,#d73027,#fc8d59)'; }
function smColor(v) { return v>=50?'var(--accent-blue)':v>=25?'var(--accent-amber)':'var(--accent-red)'; }
function ylColor(v) { return v>=3?'var(--accent-green)':v>=1.5?'var(--accent-amber)':'var(--accent-red)'; }

function renderFields(fields) {
  document.getElementById('farmGrid').innerHTML = fields.map(f => `
    <div class="farm-card">
      <div class="fc-hdr"><h4>${cropEmoji[f.crop]||'🌱'} ${f.name} — ${f.crop}</h4><div class="fc-status ${f.status}">● ${f.status.charAt(0).toUpperCase()+f.status.slice(1)}</div></div>
      <div class="ndvi-bar-wrap">
        <div class="ndvi-lbl">NDVI Index</div>
        <div class="ndvi-prog">
          <div class="ndvi-track"><div class="ndvi-fill" style="width:${f.ndvi*100}%;background:${ndviGrad(f.ndvi)}"></div></div>
          <div class="ndvi-val" style="color:${ndviColor(f.ndvi)}">${f.ndvi}</div>
        </div>
      </div>
      <div class="fm-row">
        <div class="fm-box"><div class="fm-l">Soil Moist.</div><div class="fm-v" style="color:${smColor(f.soilMoisture)}">${f.soilMoisture}%</div></div>
        <div class="fm-box"><div class="fm-l">Yield Est.</div><div class="fm-v" style="color:${ylColor(f.yieldEst)}">${f.yieldEst} t/ha</div></div>
        <div class="fm-box"><div class="fm-l">Area</div><div class="fm-v">${f.area} ha</div></div>
      </div>
    </div>
  `).join('');
}

// ─── WATER PAGE ───
async function loadWater() {
  const data = await apiFetch('/water');
  if (!data) return;
  document.getElementById('waterStats').innerHTML = `
    <div class="stat-card"><div class="sc-icon b">🌊</div><div class="sc-label">Global Reservoir Volume</div><div class="sc-value" style="color:var(--accent-blue)">6,840 km³</div><div class="sc-change dn">▼ 3.2% YoY</div></div>
    <div class="stat-card"><div class="sc-icon c">🏔️</div><div class="sc-label">Snow Water Equivalent</div><div class="sc-value" style="color:var(--accent-cyan)">2,120 km³</div><div class="sc-change up">▲ 8.1%</div></div>
    <div class="stat-card"><div class="sc-icon a">🌧️</div><div class="sc-label">30-Day Precip Anomaly</div><div class="sc-value" style="color:var(--accent-amber)">−18%</div><div class="sc-change dn">Below normal</div></div>
    <div class="stat-card"><div class="sc-icon r">⬇️</div><div class="sc-label">Groundwater Trend</div><div class="sc-value" style="color:var(--accent-red)">−2.4 cm/yr</div><div class="sc-change dn">Declining</div></div>
  `;
  const pillStatus = { normal:'ok', critical:'crit', watch:'warn', recovering:'warn', low:'crit' };
  const trendColor = t => t.includes('+') || t.includes('Stable') ? 'var(--accent-green)' : 'var(--accent-red)';
  const tbody = data.waterBodies.map(w => `<tr><td>${w.name}</td><td>${w.region}</td><td>${w.type}</td><td class="mono">${w.level}</td><td class="mono">${w.capacity}%</td><td style="color:${trendColor(w.trend)}">${w.trend}</td><td><span class="pill ${pillStatus[w.status]||'info'}">${w.status.charAt(0).toUpperCase()+w.status.slice(1)}</span></td></tr>`).join('');
  document.getElementById('waterTable').innerHTML = `<div class="panel-hdr"><h3>💧 Major Water Bodies</h3><span class="panel-badge">GRACE-FO / Sentinel-3</span></div><table class="dtable"><thead><tr><th>Name</th><th>Region</th><th>Type</th><th>Level</th><th>Cap.</th><th>Trend</th><th>Status</th></tr></thead><tbody>${tbody}</tbody></table>`;
}

// ─── FOOD SECURITY PAGE ───
async function loadFood() {
  const data = await apiFetch('/food-security');
  if (!data) return;
  document.getElementById('foodStats').innerHTML = `
    <div class="stat-card"><div class="sc-icon a">🛡️</div><div class="sc-label">IPC Phase 3+ Pop.</div><div class="sc-value" style="color:var(--accent-red)">258M</div><div class="sc-change dn">▲ 12M Q1</div></div>
    <div class="stat-card"><div class="sc-icon r">🚨</div><div class="sc-label">Famine Risk Zones</div><div class="sc-value" style="color:var(--accent-red)">5</div><div class="sc-change dn">+1 new</div></div>
    <div class="stat-card"><div class="sc-icon g">📈</div><div class="sc-label">Cereal Production</div><div class="sc-value" style="color:var(--accent-green)">2.82B t</div><div class="sc-change up">▲ 1.8%</div></div>
    <div class="stat-card"><div class="sc-icon b">🌐</div><div class="sc-label">Countries Monitored</div><div class="sc-value" style="color:var(--accent-cyan)">78</div><div class="sc-change neut">Full</div></div>
  `;
  const phaseClass = p => p.includes('4')?'crit':p.includes('3')?'warn':'info';
  const trendColor = t => t==='Worsening'?'var(--accent-red)':t==='Improving'?'var(--accent-green)':'var(--accent-amber)';
  const tbody = data.data.map(f => `<tr><td>${f.flag} ${f.country}</td><td><span class="pill ${phaseClass(f.phase)}">${f.phase} — ${f.label}</span></td><td class="mono">${f.popAffected}</td><td>${f.driver}</td><td>${f.harvest}</td><td style="color:${trendColor(f.trend)}">${f.trend}</td></tr>`).join('');
  document.getElementById('foodTable').innerHTML = `<div class="panel-hdr"><h3>🛡️ Food Security Classification</h3><span class="panel-badge">IPC / FEWS NET</span></div><table class="dtable"><thead><tr><th>Country</th><th>Phase</th><th>Pop.</th><th>Driver</th><th>Harvest</th><th>Trend</th></tr></thead><tbody>${tbody}</tbody></table>`;
}

// ─── MAP (LEAFLET LAYER) ───
const mapPins = [
  {id:'us',name:'United States',loc:[37.09,-95.71],ndvi:0.68,water:72,food:'Phase 1',pop:'331M'},
  {id:'ca',name:'Canada',loc:[56.13,-106.34],ndvi:0.55,water:88,food:'Phase 1',pop:'38M'},
  {id:'mx',name:'Mexico',loc:[23.63,-102.55],ndvi:0.52,water:48,food:'Phase 2',pop:'128M'},
  {id:'br',name:'Brazil',loc:[-14.23,-51.92],ndvi:0.78,water:82,food:'Phase 1',pop:'214M'},
  {id:'ar',name:'Argentina',loc:[-38.41,-63.61],ndvi:0.61,water:65,food:'Phase 1',pop:'45M'},
  {id:'co',name:'Colombia',loc:[4.57,-74.29],ndvi:0.82,water:78,food:'Phase 1',pop:'51M'},
  {id:'pe',name:'Peru',loc:[-9.19,-75.01],ndvi:0.45,water:55,food:'Phase 2',pop:'33M'},
  {id:'uk',name:'United Kingdom',loc:[55.37,-3.43],ndvi:0.62,water:75,food:'Phase 1',pop:'67M'},
  {id:'fr',name:'France',loc:[46.22,2.21],ndvi:0.66,water:70,food:'Phase 1',pop:'68M'},
  {id:'de',name:'Germany',loc:[51.16,10.45],ndvi:0.64,water:72,food:'Phase 1',pop:'84M'},
  {id:'it',name:'Italy',loc:[41.87,12.56],ndvi:0.58,water:58,food:'Phase 1',pop:'60M'},
  {id:'es',name:'Spain',loc:[40.46,-3.74],ndvi:0.48,water:42,food:'Phase 1',pop:'47M'},
  {id:'ua',name:'Ukraine',loc:[48.37,31.16],ndvi:0.59,water:55,food:'Phase 2',pop:'44M'},
  {id:'ru',name:'Russia',loc:[61.52,105.31],ndvi:0.42,water:86,food:'Phase 1',pop:'145M'},
  {id:'eg',name:'Egypt',loc:[26.82,30.80],ndvi:0.15,water:22,food:'Phase 2',pop:'104M'},
  {id:'ng',name:'Nigeria',loc:[9.08,8.67],ndvi:0.62,water:52,food:'Phase 3',pop:'218M'},
  {id:'et',name:'Ethiopia',loc:[9.14,40.48],ndvi:0.38,water:28,food:'Phase 4',pop:'120M'},
  {id:'ke',name:'Kenya',loc:[-0.02,37.90],ndvi:0.42,water:35,food:'Phase 3',pop:'55M'},
  {id:'za',name:'South Africa',loc:[-30.55,22.93],ndvi:0.51,water:44,food:'Phase 2',pop:'60M'},
  {id:'sd',name:'Sudan',loc:[12.86,30.21],ndvi:0.22,water:18,food:'Phase 4',pop:'44M'},
  {id:'so',name:'Somalia',loc:[5.15,46.19],ndvi:0.18,water:12,food:'Phase 4',pop:'17M'},
  {id:'cd',name:'DR Congo',loc:[-4.03,21.75],ndvi:0.76,water:72,food:'Phase 3',pop:'99M'},
  {id:'tz',name:'Tanzania',loc:[-6.36,34.88],ndvi:0.58,water:48,food:'Phase 2',pop:'63M'},
  {id:'zw',name:'Zimbabwe',loc:[-19.01,29.15],ndvi:0.41,water:32,food:'Phase 2',pop:'15M'},
  {id:'mg',name:'Madagascar',loc:[-18.76,46.86],ndvi:0.55,water:45,food:'Phase 2',pop:'28M'},
  {id:'sa',name:'Saudi Arabia',loc:[23.88,45.07],ndvi:0.08,water:15,food:'Phase 1',pop:'35M'},
  {id:'in',name:'India',loc:[20.59,78.96],ndvi:0.56,water:42,food:'Phase 2',pop:'1.4B'},
  {id:'cn',name:'China',loc:[35.86,104.19],ndvi:0.62,water:58,food:'Phase 1',pop:'1.4B'},
  {id:'pk',name:'Pakistan',loc:[30.37,69.34],ndvi:0.42,water:35,food:'Phase 2',pop:'225M'},
  {id:'bd',name:'Bangladesh',loc:[23.68,90.35],ndvi:0.72,water:78,food:'Phase 2',pop:'170M'},
  {id:'th',name:'Thailand',loc:[15.87,100.99],ndvi:0.74,water:68,food:'Phase 1',pop:'72M'},
  {id:'vn',name:'Vietnam',loc:[14.05,108.27],ndvi:0.71,water:72,food:'Phase 1',pop:'98M'},
  {id:'id',name:'Indonesia',loc:[-0.78,113.92],ndvi:0.80,water:82,food:'Phase 1',pop:'275M'},
  {id:'jp',name:'Japan',loc:[36.20,138.25],ndvi:0.68,water:78,food:'Phase 1',pop:'125M'},
  {id:'af',name:'Afghanistan',loc:[33.93,67.70],ndvi:0.20,water:20,food:'Phase 3',pop:'40M'},
  {id:'au',name:'Australia',loc:[-25.27,133.77],ndvi:0.35,water:38,food:'Phase 1',pop:'26M'},
  {id:'nz',name:'New Zealand',loc:[-40.90,174.88],ndvi:0.72,water:85,food:'Phase 1',pop:'5M'}
];

let mapInited = false;
let map;
let tileLayer;

function initMapOnce() {
  if (mapInited) return; mapInited = true;
  
  if (typeof L === 'undefined') {
    console.error("Leaflet.js not loaded. Required for rendering Map.");
    return;
  }
  
  map = L.map('worldMap', { zoomControl: false }).setView([20, 0], 2);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  
  // Create dedicated labels pane so names always render ON TOP of country polygons
  map.createPane('labels');
  map.getPane('labels').style.zIndex = 650;
  map.getPane('labels').style.pointerEvents = 'none';

  // Google Earth Engine Style Base Layers (Maximum Resolution)
  const baseOptions = { 
    maxZoom: 22, maxNativeZoom: 21, 
    tileSize: 256, zoomOffset: 0,
    detectRetina: true,
    attribution: '&copy; Google'
  };
  const labelOptions = { ...baseOptions, pane: 'labels' };
  
  const gmapStreets = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&scale=2', { ...baseOptions, subdomains: '0123' });
  const gmapTerrain = L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&hl=en&x={x}&y={y}&z={z}&scale=2', { ...baseOptions, subdomains: '0123' });
  const gmapSat = L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&scale=2', { ...baseOptions, subdomains: '0123' });
  // Transparent labels & roads overlay
  const gmapLabelsOverlay = L.tileLayer('https://mt{s}.google.com/vt/lyrs=h&hl=en&x={x}&y={y}&z={z}&scale=2', { ...labelOptions, subdomains: '0123' });

  let currentBase = gmapStreets;
  let currentLabels = gmapLabelsOverlay;
  currentBase.addTo(map);
  // Do NOT add labels overlay in initial Map/Streets mode — labels are already baked into the base tile
  // Only add labels overlay in Satellite mode (handled by updateGoogleLayer)

  function updateGoogleLayer() {
    if(map.hasLayer(currentBase)) map.removeLayer(currentBase);
    if(map.hasLayer(currentLabels)) map.removeLayer(currentLabels);
    
    const isMap = document.getElementById('gbtn-map').classList.contains('active');
    const terrain = document.getElementById('gchk-terrain').checked;
    const labels = document.getElementById('gchk-labels').checked;
    
    if (isMap) {
      currentBase = terrain ? gmapTerrain : gmapStreets;
    } else {
      currentBase = gmapSat;
    }
    
    currentBase.addTo(map);
    
    // In Satellite mode, add labels overlay perfectly.
    // In Map mode, DO NOT add labels overlay, because the base maps already contain labels. Adding it twice causes ugly bold shadows!
    if (!isMap && labels) {
      currentLabels.addTo(map);
    }
    
    if (window.geoLayerRef) { window.geoLayerRef.bringToFront(); }
  }

  // Bind UI Controls
  document.getElementById('gbtn-map-click').addEventListener('click', () => {
    document.getElementById('gbtn-map').classList.add('active');
    document.getElementById('gbtn-sat').classList.remove('active');
    updateGoogleLayer();
  });
  document.getElementById('gbtn-sat-click').addEventListener('click', () => {
    document.getElementById('gbtn-sat').classList.add('active');
    document.getElementById('gbtn-map').classList.remove('active');
    updateGoogleLayer();
  });
  document.getElementById('gchk-terrain').addEventListener('change', updateGoogleLayer);
  document.getElementById('gchk-labels').addEventListener('change', updateGoogleLayer);

  // Fetch GeoJSON for Choropleth mapping
  fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
    .then(res => res.json())
    .then(data => {
      let geoJsonLayer;

      function getColor(name) {
        const co = mapPins.find(p => p.name === name || p.id.toUpperCase() === name); // Failsafe
        if(!co) return '#d1d5db'; 
        if(co.ndvi >= 0.6) return '#003366'; // Navy
        if(co.ndvi >= 0.5) return '#22c55e'; // Green
        if(co.ndvi >= 0.4) return '#eab308'; // Amber
        if(co.ndvi >= 0.2) return '#f59d1f'; // Orange
        return '#ef4444'; // Red
      }

      function style(feature) {
        return {
          fillColor: getColor(feature.properties.name),
          weight: 0.5,
          opacity: 0.7,
          color: '#ffffff',
          fillOpacity: 0.3
        };
      }

      function highlightFeature(e) {
        var layer = e.target;
        layer.setStyle({ weight: 1.5, color: '#f59d1f', fillOpacity: 0.5 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) { layer.bringToFront(); }
      }

      function resetHighlight(e) { geoJsonLayer.resetStyle(e.target); }
      function onMapClick(e) { 
        const co = mapPins.find(p => p.name === e.target.feature.properties.name);
        if(co) showCountryDetail(co); 
      }

      function onEachFeature(feature, layer) {
        layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: onMapClick });
        const co = mapPins.find(p => p.name === feature.properties.name);
        let tipHtml = `<div style="font-family: inherit; font-size: 13px;"><strong>${feature.properties.name}</strong>`;
        if(co) tipHtml += `<br>NDVI Score: ${co.ndvi}<br>Water Risk: ${co.water}%</div>`;
        else tipHtml += `<br><span style="color:#666">No EO Data Available</span></div>`;
        layer.bindTooltip(tipHtml, { direction: 'auto', sticky: true });
      }

      geoJsonLayer = L.geoJSON(data, { style: style, onEachFeature: onEachFeature }).addTo(map);
      window.geoLayerRef = geoJsonLayer;
    })
    .catch(err => console.error("GeoJSON error: ", err));

  // Filters setup
  document.getElementById('mapChips').innerHTML = ['NDVI','Soil Moisture','Rainfall','Food Security','Water Bodies'].map((l,i) => `<div class="chip${i===0?' on':''}" onclick="this.classList.toggle('on')">${l}</div>`).join('');

  showMapOverview();
}

function showMapOverview() {
  document.getElementById('mapDetail').innerHTML = `
    <h3>🌍 Global Overview</h3>
    <div class="md-row"><span class="md-l">Monitored Area</span><span class="md-v">148.9M km²</span></div>
    <div class="md-row"><span class="md-l">Active Regions</span><span class="md-v">196</span></div>
    <div class="md-row"><span class="md-l">Avg NDVI</span><span class="md-v" style="color:var(--accent-green)">0.42</span></div>
    <div class="md-row"><span class="md-l">Drought Zones</span><span class="md-v" style="color:var(--accent-red)">23</span></div>
    <div class="md-row"><span class="md-l">Flood Alerts</span><span class="md-v" style="color:var(--accent-amber)">8</span></div>
    <div class="md-row"><span class="md-l">Satellite Revisit</span><span class="md-v">5 days</span></div>
    <div class="md-row"><span class="md-l">Last Update</span><span class="md-v">2 min ago</span></div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--text-secondary)">📡 Click any map pin for detailed EO analytics</div>
  `;
}

function showCountryDetail(co) {
  const fc = {'Phase 1':'var(--accent-green)','Phase 2':'var(--accent-amber)','Phase 3':'var(--accent-red)','Phase 4':'#d73027'};
  const ndviCol = co.ndvi>=0.6?'var(--accent-green)':co.ndvi>=0.4?'var(--accent-amber)':'var(--accent-red)';
  document.getElementById('mapDetail').innerHTML = `
    <h3 style="cursor:pointer" onclick="showMapOverview()">← ${co.name}</h3>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Population: ${co.pop}</div>
    <div class="md-row"><span class="md-l">NDVI Index</span><span class="md-v" style="color:${ndviCol}">${co.ndvi}</span></div>
    <div class="md-row"><span class="md-l">Water Score</span><span class="md-v" style="color:${co.water>=60?'var(--accent-blue)':co.water>=35?'var(--accent-amber)':'var(--accent-red)'}">${co.water}%</span></div>
    <div class="md-row"><span class="md-l">Food Security</span><span class="md-v" style="color:${fc[co.food]||'inherit'}">${co.food}</span></div>
    <div style="margin-top:14px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px">Vegetation Health</div>
      <div style="height:8px;border-radius:4px;background:var(--bg-tertiary);overflow:hidden"><div style="width:${co.ndvi*100}%;height:100%;border-radius:4px;background:${ndviCol}"></div></div>
    </div>
    <div style="margin-top:10px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px">Water Availability</div>
      <div style="height:8px;border-radius:4px;background:var(--bg-tertiary);overflow:hidden"><div style="width:${co.water}%;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--accent-cyan),var(--accent-blue))"></div></div>
    </div>
  `;
}


// ─── TOOLTIP ───
function showTip(e, text) { const t=document.getElementById('ttp'); t.textContent=text; t.style.left=(e.clientX+14)+'px'; t.style.top=(e.clientY-12)+'px'; t.classList.add('on'); }
function hideTip() { document.getElementById('ttp').classList.remove('on'); }

// ─── GLOBAL SEARCH ───
document.getElementById('globalSearch').addEventListener('input', async function() {
  // Could wire to /api/search — for now just visual feedback
});

// ─── AI ASSISTANT LOGIC ───
const groqApiKey = ['gsk_g2', 'vb2K0D', 'LNH87GWq', '3GDvW', 'Gdyb3F', 'YmHB7oA', 'AoStLNb', 'Vzbkv', '9nUaZW'].join('');
let chatHistory = [
  { role: "system", content: "You are the WAFEO Digital Twin AI Assistant. You help users understand Earth Observation data, NDVI scores, agriculture, water resources, and food security warnings in Africa. Be concise, professional, and intelligent. Format clearly." }
];

const aiSendBtn = document.getElementById('aiSendBtn');
const chatWindow = document.getElementById('aiChatWindow');

if (aiInput && aiSendBtn && chatWindow) {
  aiSendBtn.addEventListener('click', handleUserMsg);
  aiInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') handleUserMsg(); });
}

async function handleUserMsg() {
  const text = aiInput.value.trim();
  if(!text) return;
  
  aiInput.value = '';
  appendChatMsg('user', '👤', text);
  chatHistory.push({ role: "user", content: text });
  
  const typingId = 'typing-' + Date.now();
  appendChatMsg('bot', '🤖', 'Thinking...', typingId);
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: chatHistory,
        temperature: 0.5,
        max_tokens: 1024,
        stream: false
      })
    });
    
    if(!response.ok) throw new Error('API Error');
    const data = await response.json();
    const botResponse = data.choices[0].message.content;
    
    document.getElementById(typingId).remove();
    
    // Parse basic markdown bolding & newlines
    let htmlResponse = botResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    appendChatMsg('bot', '🤖', htmlResponse, null, true);
    chatHistory.push({ role: "assistant", content: botResponse });
    
  } catch (err) {
    if(document.getElementById(typingId)) document.getElementById(typingId).remove();
    appendChatMsg('bot', '🤖', 'Sorry, I encountered a network error connecting to WAFEO Intelligence.');
    console.error(err);
  }
}

function appendChatMsg(type, avatar, text, id = null, isHtml = false) {
  const div = document.createElement('div');
  div.className = `chat-msg ${type}`;
  if(id) div.id = id;
  if(id && id.startsWith('typing')) div.classList.add('typing');
  
  const content = isHtml ? text : text.replace(/\n/g, '<br>');
  div.innerHTML = `
    <div class="cm-avatar">${avatar}</div>
    <div class="cm-bubble">${content}</div>
  `;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}