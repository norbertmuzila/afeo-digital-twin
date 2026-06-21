import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

start_idx = js.find('// ─── SITE INTELLIGENCE PAGE LOGIC ───')
if start_idx != -1:
    js = js[:start_idx]

new_logic = """// ─── SITE INTELLIGENCE PAGE LOGIC ───
let siMap = null;
let siMarker = null;

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

// Map Initialization
function initSiGlobalMap() {
  const container = document.getElementById('siMapInstance');
  if(!container) return;
  
  if (!siMap) {
    siMap = L.map('siMapInstance', { zoomControl: false }).setView([15, 10], 2); // Global View
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    }).addTo(siMap);
    
    // Map Click Interactivity
    siMap.on('click', async (e) => {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      analyzeRegion({ lat, lon });
    });
  }
}

// Re-init map when tab is clicked to fix Leaflet size rendering bugs
document.querySelector('[data-page="site-intelligence"]').addEventListener('click', () => {
  setTimeout(() => {
    initSiGlobalMap();
    if(siMap) siMap.invalidateSize();
  }, 100);
});

async function analyzeRegion(query) {
  const scanOverlay = document.getElementById('siScanOverlay');
  scanOverlay.style.opacity = '1';
  document.querySelector('.si-scanner-line').style.animationPlayState = 'running';
  
  let targetLat, targetLon, siteName, siteMeta;

  try {
    // 1. Resolve Location via OpenStreetMap (Nominatim API)
    if (typeof query === 'string') {
      // Hardcoded Chivaraidze check for extremely specific requested local details
      if (query.toLowerCase().includes('chivaraidze')) {
         targetLat = -17.8; targetLon = 31.3;
         siteName = "Chivaraidze Agro-Industrial Park";
         siteMeta = "Goromonzi, Mashonaland East, Zimbabwe · Granite-derived Sandy Loam";
      } else {
         const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
         const geoData = await geoRes.json();
         if (geoData && geoData.length > 0) {
           targetLat = parseFloat(geoData[0].lat);
           targetLon = parseFloat(geoData[0].lon);
           siteName = geoData[0].name || query;
           siteMeta = geoData[0].display_name;
         } else {
           throw new Error("Location not found on global registry.");
         }
      }
    } else {
      // Clicked Coordinate Reverse Geocoding
      targetLat = query.lat; targetLon = query.lon;
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${targetLat}&lon=${targetLon}&format=json`);
      const geoData = await geoRes.json();
      siteName = geoData.name || (geoData.address ? geoData.address.village || geoData.address.town || geoData.address.city || geoData.address.county : "Unknown Farm / Region");
      siteMeta = geoData.display_name || `Lat: ${targetLat.toFixed(4)}, Lon: ${targetLon.toFixed(4)}`;
    }

    // Fly map to location
    if (siMap) {
      siMap.flyTo([targetLat, targetLon], 14, { duration: 1.5 });
      if (siMarker) siMarker.remove();
      siMarker = L.circleMarker([targetLat, targetLon], { radius: 12, fillColor: 'var(--accent-emerald)', color: '#fff', weight: 3, opacity: 1, fillOpacity: 0.8 }).addTo(siMap);
    }

    // 2. Fetch Live Climate/Weather from Open-Meteo
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current_weather=true&daily=temperature_2m_max,precipitation_sum&timezone=auto`);
    const weatherData = await weatherRes.json();
    
    const currentTemp = weatherData.current_weather ? weatherData.current_weather.temperature : 25;
    const precipSum = (weatherData.daily && weatherData.daily.precipitation_sum) ? weatherData.daily.precipitation_sum[0] : 0;
    
    // Simulate NDVI/Water stats based on live real-world weather inputs
    const isDry = precipSum < 2 && currentTemp > 30;
    const ndviEstimate = isDry ? (Math.random() * 0.3 + 0.2).toFixed(2) : (Math.random() * 0.4 + 0.5).toFixed(2);
    
    // Construct Dynamic Overview
    let overview = [
      { id: 'farming', title: 'Farming Infrastructure', icon: siSvgs.farming, badge: 'Optimal', badgeClass: 'optimal', desc: `Region supports active agricultural infrastructure. Thermal scanning shows normal utilization levels.` },
      { id: 'water', title: 'Water Hydrology', icon: siSvgs.water, badge: isDry ? 'Concern' : 'Optimal', badgeClass: isDry ? 'concern' : 'optimal', desc: `Live precipitation recorded at ${precipSum}mm. ${isDry ? 'Severe stress on local irrigation' : 'Water flow and local irrigation networks are stable.'}` },
      { id: 'agriculture', title: 'Agriculture & Vegetation', icon: siSvgs.agriculture, badge: parseFloat(ndviEstimate) < 0.4 ? 'Watch' : 'Optimal', badgeClass: parseFloat(ndviEstimate) < 0.4 ? 'watch' : 'optimal', desc: `Estimated vegetation health (NDVI) is ${ndviEstimate}. ${parseFloat(ndviEstimate) < 0.4 ? 'Crops showing signs of stress.' : 'Vegetation is extremely healthy.'}` },
      { id: 'climate', title: 'Climate & Heat', icon: siSvgs.climate, badge: currentTemp > 32 ? 'Concern' : 'Watch', badgeClass: currentTemp > 32 ? 'concern' : 'watch', desc: `Live surface temperature is ${currentTemp} °C. ${currentTemp > 32 ? 'Extreme heat detected.' : 'Normal seasonal thermal signature.'}` },
      { id: 'foodSec', title: 'Food Security Alert', icon: siSvgs.foodSec, badge: isDry ? 'Concern' : 'Watch', badgeClass: isDry ? 'concern' : 'watch', desc: `Region IPC phase estimated based on local weather yields. ${isDry ? 'High risk of yield reduction.' : 'Stable local market forecast.'}` }
    ];

    let evidence = [
      { title: 'Vegetation Shift (30d)', trend: parseFloat(ndviEstimate) < 0.4 ? 'negative' : 'positive', desc: `NDVI trended ${parseFloat(ndviEstimate) < 0.4 ? 'downward' : 'upward'} following recent weather patterns.` },
      { title: 'Hydrology Change (7d)', trend: isDry ? 'negative' : 'positive', desc: `Recent precipitation sum of ${precipSum}mm drove a ${isDry ? 'decrease' : 'steady state'} in soil moisture.` }
    ];

    // Restore Chivaraidze specifics if searched
    if (typeof query === 'string' && query.toLowerCase().includes('chivaraidze')) {
        overview[0].desc = 'Multi-enterprise farming operational: Milling plants, Abattoirs, and Freeze drying facilities active.';
        overview[1].desc = `Live precipitation: ${precipSum}mm. Permanent water is adjacent. SAZ certified water plant fully operational and scaling.`;
        overview[2].desc = `Vegetation is robust (NDVI ${ndviEstimate}). Crops: Maize, Wheat, Soya, Pawpaw, Macadamia. Livestock: 300 cattle, 600 goats.`;
        evidence = [
          { title: 'Vegetation & ecosystem', trend: 'positive', desc: 'NDVI improved by +0.04 (12%) due to recent implementation of multi-enterprise horticulture.' },
          { title: 'Water & hydrology', trend: 'positive', desc: 'Water network connection remains stable. New SAZ certified water plant operational.' },
          { title: 'Land use & cover', trend: 'positive', desc: 'Built infrastructure increased by 5% due to completion of the new milling and oil production facilities.' }
        ];
    }

    // Update UI
    document.getElementById('siSiteName').textContent = siteName;
    document.getElementById('siSiteMeta').textContent = siteMeta;

    document.getElementById('siMetricsGrid').innerHTML = overview.map(m => `
      <div class="si-card">
        <div class="si-card-hdr">
          <div class="si-card-title">${m.icon} ${m.title}</div>
          <span class="si-badge ${m.badgeClass}">${m.badge}</span>
        </div>
        <div class="si-card-desc">${m.desc}</div>
      </div>
    `).join('');

    document.getElementById('siCompareList').innerHTML = evidence.map(c => `
      <div class="si-compare-item ${c.trend}">
        <div class="si-compare-title">${c.title}</div>
        <div class="si-compare-desc">${c.desc}</div>
      </div>
    `).join('');

    document.getElementById('siRegList').innerHTML = `
      <div class="si-reg-item">
        <div class="si-reg-title"><span>Water Use Compliance</span> <span class="si-reg-status compliant">Compliant</span></div>
        <div class="si-card-desc">Irrigation extraction aligns with regional water quotas.</div>
      </div>
      <div class="si-reg-item">
        <div class="si-reg-title"><span>Deforestation Policy</span> <span class="si-reg-status warning">Warning</span></div>
        <div class="si-card-desc">Proximity to protected biodiversity area. Monitoring active.</div>
      </div>
    `;

    setTimeout(() => {
      scanOverlay.style.opacity = '0';
    }, 1000);

  } catch (error) {
    console.error("Site Intelligence API Error:", error);
    document.getElementById('siSiteName').textContent = "Analysis Failed";
    document.getElementById('siSiteMeta').textContent = error.message;
    scanOverlay.style.opacity = '0';
  }
}
"""

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.write(js + "\n" + new_logic)

print("app.js logic replaced successfully")
