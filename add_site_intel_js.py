import sys
import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    code = f.read()

site_intel_js = """
// ─── SITE INTELLIGENCE ENGINE ───

// SVG Icons matching ABIL minimalist aesthetic
const svgs = {
  water: `<svg class="sim-icon" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path></svg>`,
  flood: `<svg class="sim-icon" viewBox="0 0 24 24"><path d="M2 12h20M4 16h16M6 20h12"></path></svg>`,
  vegetation: `<svg class="sim-icon" viewBox="0 0 24 24"><path d="M11 20A7 7 0 014 13V4a9 9 0 0115 5 7 7 0 01-8 11z"></path></svg>`,
  heat: `<svg class="sim-icon" viewBox="0 0 24 24"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"></path></svg>`,
  landUse: `<svg class="sim-icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>`,
  biodiversity: `<svg class="sim-icon" viewBox="0 0 24 24"><path d="M5 13a7 7 0 0114 0M12 2v11M9 6h6"></path></svg>`
};

const chivaraidzeData = {
  name: "Chivaraidze Agro-Industrial Park",
  meta: "Goromonzi, Mashonaland East, Zimbabwe · Granite-derived Sandy Loam",
  coords: [-17.8, 31.3],
  metrics: [
    { id: 'water', title: 'Water & hydrology', icon: svgs.water, badge: 'Concern', badgeClass: 'concern', desc: 'Permanent water is right next to the site, so its connection to the water network is high. Includes SAZ certified water plant.' },
    { id: 'flood', title: 'Flood & physical exposure', icon: svgs.flood, badge: 'Concern', badgeClass: 'concern', desc: '57% of the area is low-lying ground where water tends to collect, so flood susceptibility is high.' },
    { id: 'vegetation', title: 'Vegetation & ecosystem', icon: svgs.vegetation, badge: 'Watch', badgeClass: 'watch', desc: 'Vegetation around the site is moderate (NDVI 0.36). Multi-enterprise farming: Maize, Wheat, Pawpaw orchard, Macadamia.' },
    { id: 'heat', title: 'Heat & temperature', icon: svgs.heat, badge: 'Watch', badgeClass: 'watch', desc: 'Land surface temperature runs 1.9 °C above the regional average, a mild thermal signature.' },
    { id: 'landUse', title: 'Land use & cover', icon: svgs.landUse, badge: 'Watch', badgeClass: 'watch', desc: 'Built and bare ground make up 42% of the area around the site. Includes milling plants, abattoirs, and freeze drying facilities.' },
    { id: 'biodiversity', title: 'Biodiversity & nature', icon: svgs.biodiversity, badge: 'Watch', badgeClass: 'watch', desc: 'A protected area sits 1594 m away, so proximity-based nature exposure is moderate.' }
  ],
  compare: [
    { title: 'Vegetation & ecosystem', trend: 'positive', desc: 'NDVI improved by +0.04 (12%) due to recent implementation of multi-enterprise horticulture.' },
    { title: 'Water & hydrology', trend: 'neutral', desc: 'Water network connection remains stable. New SAZ certified water plant fully operational.' },
    { title: 'Flood & physical exposure', trend: 'negative', desc: 'Flood susceptibility increased slightly (+2%) following recent heavy seasonal rains in Mashonaland East.' },
    { title: 'Land use & cover', trend: 'neutral', desc: 'Built infrastructure increased by 5% due to completion of the new milling and oil production facilities.' }
  ]
};

let simMap = null;

// Search listeners
const searchBtn = document.getElementById('siteSearchBtn');
const searchInput = document.getElementById('siteSearchInput');

if (searchBtn && searchInput) {
  const triggerSearch = () => {
    const query = searchInput.value.trim();
    if (query) analyzeSite(query);
  };
  searchBtn.addEventListener('click', triggerSearch);
  searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') triggerSearch(); });
}

function analyzeSite(query) {
  const overlay = document.getElementById('siteIntelOverlay');
  const scanOverlay = document.getElementById('simScanOverlay');
  overlay.classList.add('show');
  scanOverlay.classList.add('scanning');
  
  // Decide payload
  let data;
  if (query.toLowerCase().includes('chivaraidze')) {
    data = chivaraidzeData;
  } else {
    // Generate proxy data
    data = JSON.parse(JSON.stringify(chivaraidzeData)); // deep copy
    data.name = query;
    data.meta = "Unknown Coordinates · Proxy Soil Analysis";
    data.coords = [ (Math.random()*180)-90, (Math.random()*360)-180 ];
  }

  // Set Headers
  document.getElementById('simTitle').textContent = data.name;
  document.getElementById('simMeta').textContent = data.meta;

  // Render Current Metrics
  const grid = document.getElementById('simMetricsGrid');
  grid.innerHTML = data.metrics.map(m => `
    <div class="sim-card">
      <div class="sim-card-hdr">
        <div class="sim-card-title">${m.icon} ${m.title}</div>
        <span class="sim-badge ${m.badgeClass}">${m.badge}</span>
      </div>
      <div class="sim-card-desc">${m.desc}</div>
    </div>
  `).join('');

  // Render Compare Metrics
  const compareList = document.getElementById('simCompareList');
  compareList.innerHTML = data.compare.map(c => `
    <div class="sim-compare-item ${c.trend}">
      <div class="sim-compare-title">${c.title}</div>
      <div class="sim-compare-desc">${c.desc}</div>
    </div>
  `).join('');

  // Simulate scanning delay
  setTimeout(() => {
    scanOverlay.classList.remove('scanning');
    initSimMap(data.coords);
  }, 1500);
}

function closeSiteIntel() {
  document.getElementById('siteIntelOverlay').classList.remove('show');
  if (simMap) {
    simMap.remove();
    simMap = null;
  }
}

function switchSimTab(tab) {
  document.querySelectorAll('.sim-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sim-tab-content').forEach(el => el.classList.remove('active'));
  
  if (tab === 'current') {
    document.querySelector('.sim-tab:nth-child(1)').classList.add('active');
    document.getElementById('simTabCurrent').classList.add('active');
  } else {
    document.querySelector('.sim-tab:nth-child(2)').classList.add('active');
    document.getElementById('simTabCompare').classList.add('active');
  }
}

// 2D/3D Map Logic
const btn2D = document.getElementById('simBtn2D');
const btn3D = document.getElementById('simBtn3D');
const simMapContainer = document.querySelector('.sim-map-container');

if (btn2D && btn3D) {
  btn2D.addEventListener('click', () => {
    btn2D.classList.add('active'); btn3D.classList.remove('active');
    simMapContainer.classList.remove('mode-3d');
  });
  btn3D.addEventListener('click', () => {
    btn3D.classList.add('active'); btn2D.classList.remove('active');
    simMapContainer.classList.add('mode-3d');
  });
}

function initSimMap(coords) {
  if (simMap) {
    simMap.remove();
  }
  simMap = L.map('simMapInstance', { zoomControl: false }).setView(coords, 14);
  
  // Use a satellite hybrid layer for tactical look
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
  }).addTo(simMap);
  
  // Add a precise marker target
  L.circleMarker(coords, {
    radius: 12, fillColor: 'var(--accent-emerald)', color: '#fff', weight: 3, opacity: 1, fillOpacity: 0.8
  }).addTo(simMap);
}
"""

with codecs.open("app.js", "a", encoding="utf-8") as f:
    f.write(site_intel_js)

print("app.js updated with Site Intel Logic")
