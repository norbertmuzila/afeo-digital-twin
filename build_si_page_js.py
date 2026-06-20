import sys
import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

si_logic = """
// ─── SITE INTELLIGENCE PAGE LOGIC ───
let siMap = null;

const siSvgs = {
  farming: `<svg class="si-icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>`,
  water: `<svg class="si-icon" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path></svg>`,
  agriculture: `<svg class="si-icon" viewBox="0 0 24 24"><path d="M11 20A7 7 0 014 13V4a9 9 0 0115 5 7 7 0 01-8 11z"></path></svg>`,
  climate: `<svg class="si-icon" viewBox="0 0 24 24"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"></path></svg>`,
  foodSec: `<svg class="si-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
};

const siSearchBtn = document.getElementById('siSearchBtn');
const siSearchInput = document.getElementById('siSearchInput');

if (siSearchBtn && siSearchInput) {
  const triggerSISearch = () => {
    const query = siSearchInput.value.trim();
    if (query) analyzeRegion(query);
  };
  siSearchBtn.addEventListener('click', triggerSISearch);
  siSearchInput.addEventListener('keypress', e => { if (e.key === 'Enter') triggerSISearch(); });
}

// Tab Switching
document.querySelectorAll('.si-tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.si-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.si-tab-content').forEach(c => c.style.display = 'none');
    
    e.target.classList.add('active');
    document.getElementById('siTab-' + e.target.dataset.tab).style.display = 'block';
  });
});

// 2D/3D Map Logic
const siBtn2D = document.getElementById('siBtn2D');
const siBtn3D = document.getElementById('siBtn3D');
const siMapPanel = document.querySelector('.si-map-panel');

if (siBtn2D && siBtn3D) {
  siBtn2D.addEventListener('click', () => {
    siBtn2D.classList.add('active'); siBtn3D.classList.remove('active');
    siMapPanel.classList.remove('mode-3d');
  });
  siBtn3D.addEventListener('click', () => {
    siBtn3D.classList.add('active'); siBtn2D.classList.remove('active');
    siMapPanel.classList.add('mode-3d');
  });
}

function analyzeRegion(query) {
  const scanOverlay = document.getElementById('siScanOverlay');
  scanOverlay.style.opacity = '1';
  
  let data = {
    name: query,
    meta: "Coordinates: " + ((Math.random()*180)-90).toFixed(4) + ", " + ((Math.random()*360)-180).toFixed(4),
    coords: [ (Math.random()*40)-20, (Math.random()*60) ], // Africa bias
    overview: [
      { id: 'farming', title: 'Farming Infrastructure', icon: siSvgs.farming, badge: 'Watch', badgeClass: 'watch', desc: 'Active farming infrastructure covers 42% of the local grid. Minor stress on machinery utilization detected.' },
      { id: 'water', title: 'Water Hydrology', icon: siSvgs.water, badge: 'Concern', badgeClass: 'concern', desc: 'Permanent water is adjacent, but upstream flow shows a 15% reduction affecting local irrigation networks.' },
      { id: 'agriculture', title: 'Agriculture & Vegetation', icon: siSvgs.agriculture, badge: 'Optimal', badgeClass: 'optimal', desc: 'Vegetation is extremely healthy (NDVI 0.72). Primary crops identified: Maize and Wheat.' },
      { id: 'climate', title: 'Climate & Heat', icon: siSvgs.climate, badge: 'Watch', badgeClass: 'watch', desc: 'Land surface temperature runs 1.9 °C above the regional average, an elevated thermal signature.' },
      { id: 'foodSec', title: 'Food Security Alert', icon: siSvgs.foodSec, badge: 'Watch', badgeClass: 'watch', desc: 'Local region is classified as IPC Phase 2 (Stressed) due to localized market inflation.' }
    ],
    evidence: [
      { title: 'Vegetation Shift', trend: 'positive', desc: 'NDVI improved by +0.04 over the last 30 days.' },
      { title: 'Hydrology Change', trend: 'negative', desc: 'Groundwater index decreased by 4%.' }
    ],
    regulatory: [
      { title: 'Water Use Compliance', status: 'Compliant', class: 'compliant', desc: 'Irrigation extraction is within limits.' },
      { title: 'Deforestation Policy', status: 'Warning', class: 'warning', desc: 'Proximity to protected biodiversity area.' }
    ]
  };

  if (query.toLowerCase().includes('chivaraidze')) {
    data.name = "Chivaraidze Agro-Industrial Park";
    data.meta = "Goromonzi, Mashonaland East, Zimbabwe · Granite-derived Sandy Loam";
    data.coords = [-17.8, 31.3];
    data.overview[0].desc = 'Multi-enterprise farming operational: Milling plants, Abattoirs, and Freeze drying facilities active.';
    data.overview[1].desc = 'Permanent water is adjacent. SAZ certified water plant fully operational and scaling.';
    data.overview[2].desc = 'Vegetation is robust. Crops: Maize, Wheat, Soya, Pawpaw, Macadamia. Livestock: 300 cattle, 600 goats.';
  }

  // Update UI
  document.getElementById('siSiteName').textContent = data.name;
  document.getElementById('siSiteMeta').textContent = data.meta;

  document.getElementById('siMetricsGrid').innerHTML = data.overview.map(m => `
    <div class="si-card">
      <div class="si-card-hdr">
        <div class="si-card-title">${m.icon} ${m.title}</div>
        <span class="si-badge ${m.badgeClass}">${m.badge}</span>
      </div>
      <div class="si-card-desc">${m.desc}</div>
    </div>
  `).join('');

  document.getElementById('siCompareList').innerHTML = data.evidence.map(c => `
    <div class="si-compare-item ${c.trend}">
      <div class="si-compare-title">${c.title}</div>
      <div class="si-compare-desc">${c.desc}</div>
    </div>
  `).join('');

  document.getElementById('siRegList').innerHTML = data.regulatory.map(r => `
    <div class="si-reg-item">
      <div class="si-reg-title"><span>${r.title}</span> <span class="si-reg-status ${r.class}">${r.status}</span></div>
      <div class="si-card-desc">${r.desc}</div>
    </div>
  `).join('');

  setTimeout(() => {
    scanOverlay.style.opacity = '0';
    initSiMap(data.coords);
  }, 1200);
}

function initSiMap(coords) {
  if (siMap) siMap.remove();
  
  const container = document.getElementById('siMapInstance');
  if(!container) return;
  
  siMap = L.map('siMapInstance', { zoomControl: false }).setView(coords, 14);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
  }).addTo(siMap);
  L.circleMarker(coords, { radius: 12, fillColor: 'var(--accent-emerald)', color: '#fff', weight: 3, opacity: 1, fillOpacity: 0.8 }).addTo(siMap);
}
"""

js = js.replace('// --- MAP (LEAFLET LAYER) ---', si_logic + '\n// --- MAP (LEAFLET LAYER) ---')

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("app.js updated for Dedicated Site Intel Page")
