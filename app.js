// ════════════════════════════════════════
//  AfEO Model — Frontend Application
// ════════════════════════════════════════

const API = '/api';
let authToken = null;
let currentUser = null;

// ─── LOGIN PARTICLES ───
(function initParticles() {
  const pf = document.getElementById('particles');
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = (100 + Math.random() * 20) + '%';
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay = Math.random() * 10 + 's';
    p.style.width = p.style.height = (1.5 + Math.random() * 2.5) + 'px';
    const hue = [210, 150, 190][Math.floor(Math.random() * 3)];
    p.style.background = `hsla(${hue}, 80%, 60%, ${0.15 + Math.random() * 0.25})`;
    pf.appendChild(p);
  }
})();

// ─── GLOBE CANVAS ───
(function initGlobe() {
  const canvas = document.getElementById('globeCanvas');
  const ctx = canvas.getContext('2d');
  let w, h;
  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);

  const pts = [];
  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 160 + Math.random() * 120;
    pts.push({ a: angle, r, speed: 0.0005 + Math.random() * 0.001, size: 0.8 + Math.random() * 1.5, alpha: 0.1 + Math.random() * 0.3 });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;

    // Faint globe outline
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(59,130,246,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Latitude lines
    for (let i = -2; i <= 2; i++) {
      const ry = 180 * Math.cos(i * 0.4);
      const oy = 180 * Math.sin(i * 0.4);
      ctx.beginPath();
      ctx.ellipse(cx, cy + oy, ry, 20, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59,130,246,0.03)';
      ctx.stroke();
    }

    // Points
    pts.forEach(p => {
      p.a += p.speed;
      const x = cx + Math.cos(p.a) * p.r;
      const y = cy + Math.sin(p.a) * p.r * 0.5;
      const behind = Math.sin(p.a) < 0;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = behind
        ? `rgba(59,130,246,${p.alpha * 0.3})`
        : `rgba(59,130,246,${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  draw();
})();

// ─── AUTH ───
document.getElementById('btnLogin').addEventListener('click', doLogin);
document.getElementById('inPass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

async function doLogin() {
  const username = document.getElementById('inUser').value.trim();
  const password = document.getElementById('inPass').value;
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');

  try {
    const res = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Login failed'; errEl.classList.add('show'); return; }

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
    errEl.textContent = 'Server unavailable — loading demo mode';
    errEl.classList.add('show');
    // Demo mode fallback
    setTimeout(() => {
      currentUser = { name: 'Demo User', role: 'admin' };
      document.getElementById('sbName').textContent = 'Demo User';
      document.getElementById('sbRole').textContent = 'Demo Mode';
      document.getElementById('sbAvatar').textContent = 'DM';
      document.getElementById('loginScreen').classList.add('out');
      setTimeout(() => { document.getElementById('appShell').classList.add('on'); }, 400);
      loadDashboardDemo();
      initMapOnce();
    }, 800);
  }
}

function doLogout() {
  if (authToken) fetch(API + '/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken } });
  authToken = null; currentUser = null;
  document.getElementById('appShell').classList.remove('on');
  setTimeout(() => { document.getElementById('loginScreen').classList.remove('out'); }, 400);
}

// ─── NAV ───
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
    document.getElementById('pgCrumb').textContent = 'AfEO / ' + (titleMap[pg] || pg);
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
  const stats = await apiFetch('/dashboard/stats');
  const alerts = await apiFetch('/alerts');
  const sats = await apiFetch('/satellites');
  const ndvi = await apiFetch('/analytics/ndvi-by-region');

  if (stats) renderStats(stats);
  if (alerts) renderAlerts(alerts.alerts);
  if (sats) renderSatellites(sats.satellites);
  if (ndvi) renderNDVIChart(ndvi.data);
  renderWaterGauges();
  renderFoodQuick();
}

function loadDashboardDemo() {
  renderStats({ cropHealth:{value:'78.4',change:'+3.2%',trend:'up'}, waterScore:{value:'62.1',change:'-5.8%',trend:'down'}, foodAlerts:{value:14,change:'+4 critical',trend:'up'}, satellites:{value:'7/9',change:'Sentinel-2, Landsat-9',trend:'up'} });
  renderAlerts([
    {severity:'critical',title:'Severe Drought — Horn of Africa',desc:'Rainfall deficit exceeding 60% across Somalia, Ethiopia.',source:'Sentinel-3 OLCI',timestamp:new Date().toISOString()},
    {severity:'warning',title:'Crop Stress — Punjab, India',desc:'NDVI anomaly −0.18 in wheat belt.',source:'Landsat-9',timestamp:new Date().toISOString()},
    {severity:'warning',title:'Reservoir Low — Lake Kariba',desc:'Water level at 34% capacity.',source:'GRACE-FO',timestamp:new Date().toISOString()},
    {severity:'info',title:'Planting Advisory — West Africa',desc:'Optimal window opens in 14 days.',source:'SMAP',timestamp:new Date().toISOString()},
  ]);
  renderNDVIChart([{region:'S. America',ndvi:0.78},{region:'SE Asia',ndvi:0.74},{region:'N. America',ndvi:0.68},{region:'Europe',ndvi:0.64},{region:'W. Africa',ndvi:0.62},{region:'S. Asia',ndvi:0.56},{region:'E. Africa',ndvi:0.38},{region:'Oceania',ndvi:0.42},{region:'C. Asia',ndvi:0.35},{region:'M. East',ndvi:0.18}]);
  renderSatellites([{name:'Sentinel-2A',agency:'ESA',passTime:'06:42',coverage:'Sub-Saharan Africa',resolution:'10m',dataType:'Multispectral',status:'active'},{name:'Sentinel-2B',agency:'ESA',passTime:'09:15',coverage:'South Asia',resolution:'10m',dataType:'Multispectral',status:'active'},{name:'Landsat-9',agency:'NASA/USGS',passTime:'10:30',coverage:'Latin America',resolution:'30m',dataType:'OLI-2',status:'active'},{name:'MODIS',agency:'NASA',passTime:'11:45',coverage:'Global',resolution:'250m',dataType:'Spectral',status:'active'},{name:'SMAP',agency:'NASA',passTime:'14:20',coverage:'C. Asia',resolution:'9km',dataType:'Soil',status:'scheduled'},{name:'GRACE-FO',agency:'NASA/DLR',passTime:'16:55',coverage:'Africa',resolution:'300km',dataType:'Gravity',status:'scheduled'}]);
  renderWaterGauges();
  renderFoodQuick();
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

// ─── MAP ───
const mapCountries = [
  {id:'us',name:'United States',d:'M 85 130 L 175 125 L 190 145 L 185 165 L 160 180 L 120 175 L 80 165 Z',ndvi:0.68,water:72,food:'Phase 1',c:'#91cf60',pop:'331M'},
  {id:'ca',name:'Canada',d:'M 75 60 L 200 55 L 210 100 L 195 125 L 85 130 L 60 105 Z',ndvi:0.55,water:88,food:'Phase 1',c:'#1a9850',pop:'38M'},
  {id:'mx',name:'Mexico',d:'M 80 175 L 130 180 L 140 205 L 115 220 L 85 210 L 70 195 Z',ndvi:0.52,water:48,food:'Phase 2',c:'#d9ef8b',pop:'128M'},
  {id:'br',name:'Brazil',d:'M 195 250 L 255 235 L 275 280 L 260 340 L 220 355 L 195 310 Z',ndvi:0.78,water:82,food:'Phase 1',c:'#1a9850',pop:'214M'},
  {id:'ar',name:'Argentina',d:'M 185 340 L 220 355 L 215 420 L 195 440 L 175 410 L 170 360 Z',ndvi:0.61,water:65,food:'Phase 1',c:'#91cf60',pop:'45M'},
  {id:'co',name:'Colombia',d:'M 155 225 L 185 220 L 195 250 L 175 265 L 155 255 Z',ndvi:0.82,water:78,food:'Phase 1',c:'#1a9850',pop:'51M'},
  {id:'pe',name:'Peru',d:'M 145 260 L 175 265 L 180 310 L 165 325 L 140 300 Z',ndvi:0.45,water:55,food:'Phase 2',c:'#fee08b',pop:'33M'},
  {id:'uk',name:'United Kingdom',d:'M 360 100 L 375 95 L 378 115 L 365 120 Z',ndvi:0.62,water:75,food:'Phase 1',c:'#91cf60',pop:'67M'},
  {id:'fr',name:'France',d:'M 365 125 L 395 118 L 400 148 L 380 155 L 360 145 Z',ndvi:0.66,water:70,food:'Phase 1',c:'#91cf60',pop:'68M'},
  {id:'de',name:'Germany',d:'M 395 105 L 420 100 L 425 128 L 400 135 L 395 118 Z',ndvi:0.64,water:72,food:'Phase 1',c:'#91cf60',pop:'84M'},
  {id:'it',name:'Italy',d:'M 400 135 L 415 132 L 425 165 L 410 170 L 400 155 Z',ndvi:0.58,water:58,food:'Phase 1',c:'#d9ef8b',pop:'60M'},
  {id:'es',name:'Spain',d:'M 345 148 L 385 140 L 390 165 L 350 170 Z',ndvi:0.48,water:42,food:'Phase 1',c:'#fee08b',pop:'47M'},
  {id:'ua',name:'Ukraine',d:'M 448 97 L 500 95 L 505 118 L 455 122 Z',ndvi:0.59,water:55,food:'Phase 2',c:'#d9ef8b',pop:'44M'},
  {id:'ru',name:'Russia',d:'M 450 30 L 760 15 L 770 95 L 500 95 L 455 60 Z',ndvi:0.42,water:86,food:'Phase 1',c:'#d9ef8b',pop:'145M'},
  {id:'eg',name:'Egypt',d:'M 430 175 L 460 170 L 465 200 L 435 205 Z',ndvi:0.15,water:22,food:'Phase 2',c:'#fc8d59',pop:'104M'},
  {id:'ng',name:'Nigeria',d:'M 380 240 L 405 235 L 410 265 L 385 270 Z',ndvi:0.62,water:52,food:'Phase 3',c:'#fee08b',pop:'218M'},
  {id:'et',name:'Ethiopia',d:'M 465 240 L 495 235 L 500 265 L 470 270 Z',ndvi:0.38,water:28,food:'Phase 4',c:'#d73027',pop:'120M'},
  {id:'ke',name:'Kenya',d:'M 475 270 L 498 268 L 502 295 L 478 298 Z',ndvi:0.42,water:35,food:'Phase 3',c:'#fc8d59',pop:'55M'},
  {id:'za',name:'South Africa',d:'M 420 360 L 465 355 L 470 395 L 425 400 Z',ndvi:0.51,water:44,food:'Phase 2',c:'#d9ef8b',pop:'60M'},
  {id:'sd',name:'Sudan',d:'M 440 210 L 475 205 L 480 240 L 445 245 Z',ndvi:0.22,water:18,food:'Phase 4',c:'#d73027',pop:'44M'},
  {id:'so',name:'Somalia',d:'M 500 245 L 520 240 L 525 280 L 505 285 Z',ndvi:0.18,water:12,food:'Phase 4',c:'#d73027',pop:'17M'},
  {id:'cd',name:'DR Congo',d:'M 410 270 L 450 265 L 455 310 L 415 315 Z',ndvi:0.76,water:72,food:'Phase 3',c:'#91cf60',pop:'99M'},
  {id:'tz',name:'Tanzania',d:'M 460 295 L 490 290 L 495 325 L 465 330 Z',ndvi:0.58,water:48,food:'Phase 2',c:'#d9ef8b',pop:'63M'},
  {id:'zw',name:'Zimbabwe',d:'M 440 340 L 465 335 L 468 360 L 443 365 Z',ndvi:0.41,water:32,food:'Phase 2',c:'#fee08b',pop:'15M'},
  {id:'mg',name:'Madagascar',d:'M 500 330 L 520 325 L 525 370 L 505 375 Z',ndvi:0.55,water:45,food:'Phase 2',c:'#d9ef8b',pop:'28M'},
  {id:'sa',name:'Saudi Arabia',d:'M 475 185 L 520 180 L 525 220 L 480 225 Z',ndvi:0.08,water:15,food:'Phase 1',c:'#fc8d59',pop:'35M'},
  {id:'in',name:'India',d:'M 555 185 L 600 180 L 610 240 L 585 260 L 555 240 Z',ndvi:0.56,water:42,food:'Phase 2',c:'#d9ef8b',pop:'1.4B'},
  {id:'cn',name:'China',d:'M 600 110 L 700 100 L 715 170 L 640 185 L 600 160 Z',ndvi:0.62,water:58,food:'Phase 1',c:'#91cf60',pop:'1.4B'},
  {id:'pk',name:'Pakistan',d:'M 545 165 L 570 160 L 575 195 L 550 200 Z',ndvi:0.42,water:35,food:'Phase 2',c:'#fee08b',pop:'225M'},
  {id:'bd',name:'Bangladesh',d:'M 600 200 L 618 195 L 622 215 L 604 220 Z',ndvi:0.72,water:78,food:'Phase 2',c:'#91cf60',pop:'170M'},
  {id:'th',name:'Thailand',d:'M 640 210 L 658 205 L 662 245 L 644 250 Z',ndvi:0.74,water:68,food:'Phase 1',c:'#91cf60',pop:'72M'},
  {id:'vn',name:'Vietnam',d:'M 660 205 L 675 200 L 680 250 L 665 255 Z',ndvi:0.71,water:72,food:'Phase 1',c:'#91cf60',pop:'98M'},
  {id:'id',name:'Indonesia',d:'M 645 280 L 730 275 L 735 305 L 650 310 Z',ndvi:0.80,water:82,food:'Phase 1',c:'#1a9850',pop:'275M'},
  {id:'jp',name:'Japan',d:'M 730 125 L 745 120 L 750 160 L 735 165 Z',ndvi:0.68,water:78,food:'Phase 1',c:'#91cf60',pop:'125M'},
  {id:'af',name:'Afghanistan',d:'M 530 150 L 555 145 L 560 170 L 535 175 Z',ndvi:0.20,water:20,food:'Phase 3',c:'#fc8d59',pop:'40M'},
  {id:'au',name:'Australia',d:'M 660 330 L 760 320 L 770 395 L 665 405 Z',ndvi:0.35,water:38,food:'Phase 1',c:'#fee08b',pop:'26M'},
  {id:'nz',name:'New Zealand',d:'M 790 385 L 805 380 L 810 415 L 795 420 Z',ndvi:0.72,water:85,food:'Phase 1',c:'#91cf60',pop:'5M'},
];

const oceans = [
  {d:'M 250 80 L 340 70 L 350 200 L 300 400 L 200 420 L 160 300 L 180 200 Z', c:'rgba(59,130,246,0.06)'},
  {d:'M 740 20 L 840 10 L 840 460 L 730 460 L 710 300 L 720 100 Z', c:'rgba(59,130,246,0.04)'},
  {d:'M 450 260 L 650 250 L 660 400 L 500 410 L 430 340 Z', c:'rgba(59,130,246,0.05)'},
  {d:'M 350 145 L 470 138 L 475 160 L 355 168 Z', c:'rgba(59,130,246,0.09)'},
];

const alertPins = [
  {x:480,y:252,c:'#ef4444',l:'Drought Alert'},{x:505,y:260,c:'#ef4444',l:'Famine Risk'},
  {x:445,y:228,c:'#ef4444',l:'Conflict Zone'},{x:570,y:190,c:'#f59e0b',l:'Crop Stress'},
  {x:447,y:350,c:'#f59e0b',l:'Low Reservoir'},{x:610,y:208,c:'#3b82f6',l:'Flood Warning'},
];

let mapInited = false, mapScale = 1;
function initMapOnce() {
  if (mapInited) return; mapInited = true;
  const svg = document.getElementById('worldMap');

  // Oceans
  oceans.forEach(o => { const p = mkSVG('path'); p.setAttribute('d',o.d); p.setAttribute('fill',o.c); svg.appendChild(p); });

  // Grid
  for(let x=0;x<=820;x+=82){ const l=mkSVG('line'); l.setAttribute('x1',x);l.setAttribute('y1',0);l.setAttribute('x2',x);l.setAttribute('y2',460);l.setAttribute('stroke','rgba(255,255,255,0.02)');l.setAttribute('stroke-width','0.5');svg.appendChild(l); }
  for(let y=0;y<=460;y+=46){ const l=mkSVG('line'); l.setAttribute('x1',0);l.setAttribute('y1',y);l.setAttribute('x2',820);l.setAttribute('y2',y);l.setAttribute('stroke','rgba(255,255,255,0.02)');l.setAttribute('stroke-width','0.5');svg.appendChild(l); }

  // Countries
  mapCountries.forEach(co => {
    const p = mkSVG('path');
    p.setAttribute('d', co.d); p.setAttribute('fill', co.c);
    p.setAttribute('stroke', 'rgba(255,255,255,0.12)'); p.setAttribute('stroke-width', '0.7');
    p.style.cursor = 'pointer'; p.style.transition = 'all 0.25s';
    p.addEventListener('mouseenter', e => { p.setAttribute('stroke','#fff');p.setAttribute('stroke-width','1.5');p.style.filter='brightness(1.3) drop-shadow(0 0 8px rgba(255,255,255,0.15))'; showTip(e,`${co.name} — NDVI: ${co.ndvi} | Water: ${co.water}%`); });
    p.addEventListener('mouseleave', () => { p.setAttribute('stroke','rgba(255,255,255,0.12)');p.setAttribute('stroke-width','0.7');p.style.filter='none'; hideTip(); });
    p.addEventListener('click', () => showCountryDetail(co));
    svg.appendChild(p);
    // Label
    const ctr = pathCenter(co.d);
    const t = mkSVG('text'); t.setAttribute('x',ctr.x);t.setAttribute('y',ctr.y);t.setAttribute('fill','rgba(255,255,255,0.5)');t.setAttribute('font-size','6.5');t.setAttribute('text-anchor','middle');t.setAttribute('font-family','Outfit');t.setAttribute('pointer-events','none');t.textContent=co.id.toUpperCase();svg.appendChild(t);
  });

  // Alert pins
  alertPins.forEach(a => {
    const pulse=mkSVG('circle'); pulse.setAttribute('cx',a.x);pulse.setAttribute('cy',a.y);pulse.setAttribute('r','5');pulse.setAttribute('fill','none');pulse.setAttribute('stroke',a.c);pulse.setAttribute('stroke-width','1.5');
    pulse.innerHTML=`<animate attributeName="r" from="5" to="15" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>`;
    svg.appendChild(pulse);
    const dot=mkSVG('circle'); dot.setAttribute('cx',a.x);dot.setAttribute('cy',a.y);dot.setAttribute('r','4.5');dot.setAttribute('fill',a.c);dot.setAttribute('opacity','0.85');dot.style.cursor='pointer';
    dot.addEventListener('mouseenter',e=>showTip(e,a.l));dot.addEventListener('mouseleave',hideTip);
    svg.appendChild(dot);
  });

  // Chips
  document.getElementById('mapChips').innerHTML = ['NDVI','Soil Moisture','Rainfall','Food Security','Water Bodies'].map((l,i) => `<div class="chip${i===0?' on':''}" onclick="this.classList.toggle('on')">${l}</div>`).join('');

  // Default detail
  showMapOverview();
}

function mkSVG(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }
function pathCenter(d) { const n=d.match(/[\d.]+/g).map(Number); let sx=0,sy=0,c=0; for(let i=0;i<n.length;i+=2){sx+=n[i];sy+=n[i+1];c++;} return {x:sx/c,y:sy/c}; }

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
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--text-secondary)">📡 Click any country for detailed EO analytics</div>
  `;
}

function showCountryDetail(co) {
  const fc = {'Phase 1':'var(--accent-green)','Phase 2':'var(--accent-amber)','Phase 3':'var(--accent-red)','Phase 4':'#d73027'};
  document.getElementById('mapDetail').innerHTML = `
    <h3 style="cursor:pointer" onclick="showMapOverview()">← ${co.name}</h3>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Population: ${co.pop}</div>
    <div class="md-row"><span class="md-l">NDVI Index</span><span class="md-v" style="color:${co.ndvi>=0.6?'var(--accent-green)':co.ndvi>=0.4?'var(--accent-amber)':'var(--accent-red)'}">${co.ndvi}</span></div>
    <div class="md-row"><span class="md-l">Water Score</span><span class="md-v" style="color:${co.water>=60?'var(--accent-blue)':co.water>=35?'var(--accent-amber)':'var(--accent-red)'}">${co.water}%</span></div>
    <div class="md-row"><span class="md-l">Food Security</span><span class="md-v" style="color:${fc[co.food]||'inherit'}">${co.food}</span></div>
    <div style="margin-top:14px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px">Vegetation Health</div>
      <div style="height:8px;border-radius:4px;background:var(--bg-tertiary);overflow:hidden"><div style="width:${co.ndvi*100}%;height:100%;border-radius:4px;background:${co.c}"></div></div>
    </div>
    <div style="margin-top:10px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px">Water Availability</div>
      <div style="height:8px;border-radius:4px;background:var(--bg-tertiary);overflow:hidden"><div style="width:${co.water}%;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--accent-cyan),var(--accent-blue))"></div></div>
    </div>
  `;
}

function zoomMap(f) { mapScale*=f; mapScale=Math.max(0.5,Math.min(5,mapScale)); const svg=document.getElementById('worldMap'); const w=860/mapScale,h=470/mapScale; svg.setAttribute('viewBox',`${430-w/2} ${235-h/2} ${w} ${h}`); }
function resetMap() { mapScale=1; document.getElementById('worldMap').setAttribute('viewBox','-20 -10 860 470'); }

// ─── TOOLTIP ───
function showTip(e, text) { const t=document.getElementById('ttp'); t.textContent=text; t.style.left=(e.clientX+14)+'px'; t.style.top=(e.clientY-12)+'px'; t.classList.add('on'); }
function hideTip() { document.getElementById('ttp').classList.remove('on'); }

// ─── GLOBAL SEARCH ───
document.getElementById('globalSearch').addEventListener('input', async function() {
  // Could wire to /api/search — for now just visual feedback
});