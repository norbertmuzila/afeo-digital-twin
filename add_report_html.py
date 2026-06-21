import codecs
import re

with codecs.open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Add Generate Button inside pg-reports
btn_html = """
        <!-- WAFEO Report Generator Button -->
        <div style="margin-bottom: 20px; text-align: center;">
          <button id="btnGenerateReport" style="background: linear-gradient(135deg, var(--accent-emerald), #0b8043); color: #fff; padding: 14px 28px; font-size: 16px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;">
            <span style="font-size: 20px;">??</span> Generate Comprehensive WAFEO Report
          </button>
        </div>
"""

# Insert button above Available Reports grid
html = html.replace("<p><strong>Available Reports:</strong>", btn_html + "\n          <p><strong>Available Reports:</strong>")

# 2. Add Modal HTML before AI Widget
modal_html = """
    <!-- WAFEO REPORT MODAL -->
    <div id="wafeoReportModal" class="wafeo-modal" style="display:none;">
      <div class="wafeo-modal-content report-content">
        <div class="report-header">
          <div class="rh-logo">WAFEO</div>
          <h2>Comprehensive Regional Report</h2>
          <button class="close-report" id="btnCloseReport">&times;</button>
        </div>
        
        <div class="report-body">
          <div class="report-summary">
            <h3>Executive Summary</h3>
            <p>This automated WAFEO report provides a detailed analysis of Vegetation (NDVI), Surface Temperature, and Water Reservoir levels over the selected temporal baseline. Critical regions exhibit deviations from the 5-year trailing mean.</p>
          </div>

          <!-- Slider Controls -->
          <div class="report-tabs">
            <button class="rt-btn active" data-mode="ndvi">Vegetation (NDVI)</button>
            <button class="rt-btn" data-mode="temp">Temperature</button>
            <button class="rt-btn" data-mode="water">Water Levels</button>
          </div>

          <!-- Image Comparison Split-Slider -->
          <div class="split-slider-container">
            <!-- Under image (Period 1) -->
            <img id="ss-img-before" class="ss-img ss-img-under" src="https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&w=800&q=80" alt="Period 1">
            
            <!-- Over image (Period 2) - Masked -->
            <div class="ss-img-over-wrapper" id="ssWrapper">
               <img id="ss-img-after" class="ss-img ss-img-over" src="https://images.unsplash.com/photo-1592089416462-2b0cb7da8379?auto=format&fit=crop&w=800&q=80" alt="Period 2">
            </div>
            
            <!-- Hidden Range Input -->
            <input type="range" min="0" max="100" value="50" id="ssRange" class="ss-range">
            
            <!-- Draggable Handle -->
            <div class="ss-handle" id="ssHandle">
               <div class="ss-handle-button">??</div>
            </div>
            
            <!-- Labels -->
            <div class="ss-label ss-label-left">Period 1</div>
            <div class="ss-label ss-label-right">Period 2</div>
          </div>
          
          <div class="report-data-grid">
            <div class="rd-box"><h4>Avg Deviation</h4><span class="rd-val negative">-12.4%</span></div>
            <div class="rd-box"><h4>Risk Level</h4><span class="rd-val warning">Elevated</span></div>
            <div class="rd-box"><h4>Confidence</h4><span class="rd-val positive">High (94%)</span></div>
          </div>
        </div>
      </div>
    </div>
"""

html = html.replace("<!-- ??? FLOATING AI WIDGET ??? -->", modal_html + "\n    <!-- ??? FLOATING AI WIDGET ??? -->")

# Bump cache version
html = re.sub(r'style\.css\?v=\d+', 'style.css?v=15', html)
html = re.sub(r'app\.js\?v=\d+', 'app.js?v=15', html)

with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
print("index.html patched")
