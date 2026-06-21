import codecs
import re

with codecs.open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Add Sidebar Link
sidebar_link = r'<div class="nav-link active" data-page="dashboard"><span class="ni">🌍</span>Global Dashboard</div>\n        <div class="nav-link" data-page="site-intelligence" style="color:var(--accent-blue); font-weight:bold;"><span class="ni">🛰️</span>Site Intelligence</div>'
html = re.sub(r'<div class="nav-link active" data-page="dashboard">.*?</div>', sidebar_link, html)

# 2. Add New Page Layout before pg-reports
new_page_html = """
    <!-- ─── ENVIRONMENTAL SITE INTELLIGENCE ─── -->
    <div class="page" id="pg-site-intelligence">
      <div class="pg-pad" style="max-width:1400px; margin:0 auto; display:flex; flex-direction:column; gap:20px; height:calc(100vh - 120px);">
        
        <div class="site-intel-header" style="background:#fff; border:1px solid var(--border); border-radius:8px; padding:20px; display:flex; flex-direction:column; gap:16px; box-shadow:0 2px 10px rgba(0,0,0,0.02);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="margin:0; font-family:'Cinzel', serif; color:var(--text-dark);">Environmental Site Intelligence</h2>
              <p style="margin:4px 0 0 0; color:var(--text-muted); font-size:14px;">Analyze Farming, Water, Agriculture, and Climate metrics for any region.</p>
            </div>
            <div class="site-search-wrapper" style="position:relative; width:400px;">
              <input type="text" id="siSearchInput" placeholder="Enter Coordinates, Region, or Farm Name..." style="width:100%; padding:12px 40px 12px 20px; border-radius:30px; border:2px solid var(--border); background:var(--bg-light); color:var(--text-dark); font-family:inherit; outline:none; transition:border-color 0.2s;">
              <button id="siSearchBtn" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--accent-blue); font-size:18px;">🔍</button>
            </div>
          </div>
          
          <div class="si-tabs" style="display:flex; gap:10px; border-bottom:1px solid var(--border); padding-bottom:0;">
            <button class="si-tab-btn active" data-tab="overview">Overview</button>
            <button class="si-tab-btn" data-tab="evidence">Evidence</button>
            <button class="si-tab-btn" data-tab="regulatory">Regulatory</button>
          </div>
        </div>

        <div class="si-content-area" style="flex:1; display:flex; gap:20px; min-height:0;">
          
          <div class="si-map-panel" style="flex:1; background:#e0e0e0; border-radius:8px; border:1px solid var(--border); overflow:hidden; position:relative;">
            <div class="si-map-controls" style="position:absolute; top:20px; left:20px; z-index:1000; background:#fff; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; overflow:hidden;">
              <button id="siBtn2D" class="si-map-btn active">2D</button>
              <button id="siBtn3D" class="si-map-btn">3D Tactical</button>
            </div>
            <div id="siMapWrapper" style="width:100%; height:100%; transition:transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1); transform-style:preserve-3d;">
              <div id="siMapInstance" style="width:100%; height:100%;"></div>
            </div>
            
            <div id="siScanOverlay" style="position:absolute; inset:0; z-index:1001; background:rgba(10,15,26,0.9); display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity 0.3s;">
              <div class="si-scanner-line" style="width:100%; height:2px; background:var(--accent-emerald); box-shadow:0 0 15px var(--accent-emerald); position:absolute; top:0; animation:scanSweep 2s linear infinite;"></div>
              <div style="color:var(--accent-emerald); font-family:'Space Mono', monospace; font-size:14px; animation:pulse 1s infinite;">Acquiring Satellite Telemetry...</div>
            </div>
          </div>
          
          <div class="si-data-panel" style="width:450px; background:#fff; border:1px solid var(--border); border-radius:8px; display:flex; flex-direction:column; overflow-y:auto;">
            <div class="si-data-header" style="padding:20px; border-bottom:1px solid var(--border); background:var(--bg-light);">
              <h3 id="siSiteName" style="margin:0; color:var(--text-dark);">Global View</h3>
              <p id="siSiteMeta" style="margin:4px 0 0 0; color:var(--text-muted); font-size:12px; font-family:'Space Mono', monospace;">Awaiting specific coordinate input.</p>
            </div>
            
            <div class="si-tab-content active" id="siTab-overview" style="padding:20px;">
              <div class="si-grid" id="siMetricsGrid" style="display:flex; flex-direction:column; gap:16px;"></div>
            </div>
            
            <div class="si-tab-content" id="siTab-evidence" style="padding:20px; display:none;">
              <div class="si-compare-list" id="siCompareList" style="display:flex; flex-direction:column; gap:20px;"></div>
            </div>
            
            <div class="si-tab-content" id="siTab-regulatory" style="padding:20px; display:none;">
              <div class="si-regulatory-list" id="siRegList" style="display:flex; flex-direction:column; gap:16px;"></div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
"""

html = html.replace('<div class="page" id="pg-reports">', new_page_html + '\n    <div class="page" id="pg-reports">')

# Add cache bump to style.css and app.js
html = re.sub(r'style\.css\?v=\d+', 'style.css?v=8', html)
html = re.sub(r'app\.js\?v=\d+', 'app.js?v=8', html)

with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("index.html successfully updated")
