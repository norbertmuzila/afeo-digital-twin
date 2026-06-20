import sys
import codecs

with codecs.open("index.html", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Universal Search Bar to top-bar
search_bar_html = """        <div class="tb-center" style="flex:1; display:flex; justify-content:center; padding: 0 20px;">
          <div class="site-search-wrapper" style="position:relative; width:100%; max-width:600px;">
            <input type="text" id="siteSearchInput" placeholder="Enter Coordinates or Farm Name (e.g. Chivaraidze)..." style="width:100%; padding:10px 40px 10px 20px; border-radius:30px; border:1px solid var(--border); background:var(--bg-light); color:var(--text-dark); font-family:inherit; outline:none; transition:box-shadow 0.2s; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <button id="siteSearchBtn" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--accent-blue); font-size:18px;">🔍</button>
          </div>
        </div>
"""

# Find <div class="tb-left"> ... </div> and insert right after it
old_tb_left_end = """              <div class="cont-sub">Click Continent</div>
            </div>
          </div>
        </div>"""

code = code.replace(old_tb_left_end, old_tb_left_end + "\n" + search_bar_html)


# 2. Add Site Intelligence Modal HTML
site_intel_html = """
  <!-- ─── SITE INTELLIGENCE MODAL ─── -->
  <div class="site-intel-overlay" id="siteIntelOverlay">
    <div class="site-intel-modal">
      <div class="sim-header">
        <div class="sim-title-area">
          <h2 id="simTitle">Site Intelligence</h2>
          <div class="sim-meta" id="simMeta">Loading coordinates...</div>
        </div>
        <button class="sim-close" onclick="closeSiteIntel()">&times;</button>
      </div>
      
      <div class="sim-body">
        <!-- LEFT: Map Viewer -->
        <div class="sim-map-container">
          <div class="sim-map-controls">
            <button id="simBtn2D" class="sim-map-btn active">2D View</button>
            <button id="simBtn3D" class="sim-map-btn">3D View</button>
          </div>
          <div id="simMapWrapper">
            <div id="simMapInstance"></div>
          </div>
          <!-- Scanning Overlay -->
          <div id="simScanOverlay" class="sim-scan-overlay">
            <div class="sim-scanner-line"></div>
            <div class="sim-scan-text">Initializing Orbital Scan...</div>
          </div>
        </div>
        
        <!-- RIGHT: Analytics Dashboard -->
        <div class="sim-analytics">
          
          <div class="sim-tabs">
            <button class="sim-tab active" onclick="switchSimTab('current')">Current Assessment</button>
            <button class="sim-tab" onclick="switchSimTab('compare')">What Changed (30d)</button>
          </div>
          
          <!-- Current Tab -->
          <div id="simTabCurrent" class="sim-tab-content active">
            <div class="sim-grid" id="simMetricsGrid">
              <!-- Metrics dynamically generated here -->
            </div>
          </div>
          
          <!-- Compare Tab -->
          <div id="simTabCompare" class="sim-tab-content">
            <div class="sim-compare-list" id="simCompareList">
              <!-- Comparisons dynamically generated here -->
            </div>
          </div>
          
        </div>
      </div>
    </div>
  </div>
"""

# Insert right before the AI Widget Panel (which is near the end of body)
code = code.replace("<!--  FLOATING AI WIDGET  -->", site_intel_html + "\n    <!--  FLOATING AI WIDGET  -->")
code = code.replace("<!-- ??? FLOATING AI WIDGET ??? -->", site_intel_html + "\n    <!-- ??? FLOATING AI WIDGET ??? -->")

with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(code)

print("index.html updated with Search Bar and Site Intel Modal")
