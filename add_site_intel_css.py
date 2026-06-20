import sys
import codecs

with codecs.open("style.css", "r", encoding="utf-8") as f:
    code = f.read()

site_intel_css = """
/* ─── SITE INTELLIGENCE MODAL ─── */
.site-intel-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(10, 15, 26, 0.85);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
.site-intel-overlay.show {
  opacity: 1; pointer-events: all;
}
.site-intel-modal {
  background: #ffffff;
  width: 95%; max-width: 1200px; height: 90vh;
  border-radius: 12px;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  overflow: hidden;
  transform: translateY(20px) scale(0.98);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.site-intel-overlay.show .site-intel-modal {
  transform: translateY(0) scale(1);
}
.sim-header {
  padding: 20px 30px;
  border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: flex-start;
  background: var(--bg-light);
}
.sim-title-area h2 {
  margin: 0 0 4px 0; font-family: 'Cinzel', serif; color: var(--text-dark);
}
.sim-meta {
  color: var(--text-muted); font-size: 13px; font-family: 'Space Mono', monospace;
}
.sim-close {
  background: none; border: none; font-size: 28px; color: var(--text-muted); cursor: pointer;
}
.sim-close:hover { color: var(--accent-red); }

.sim-body {
  display: flex; flex: 1; overflow: hidden;
}

/* Map Viewer */
.sim-map-container {
  flex: 1;
  border-right: 1px solid var(--border);
  position: relative;
  background: #e0e0e0; /* Fallback map background */
  overflow: hidden;
}
#simMapWrapper {
  width: 100%; height: 100%;
  transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform-style: preserve-3d;
}
#simMapInstance {
  width: 100%; height: 100%;
}
.sim-map-controls {
  position: absolute; top: 20px; left: 20px; z-index: 1000;
  display: flex; background: #fff; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  overflow: hidden;
}
.sim-map-btn {
  background: none; border: none; padding: 8px 16px; font-weight: 600; cursor: pointer; color: var(--text-muted);
}
.sim-map-btn.active {
  background: var(--accent-blue); color: #fff;
}

/* 3D Map CSS Perspective Magic */
.sim-map-container.mode-3d #simMapWrapper {
  transform: perspective(1200px) rotateX(60deg) scale(1.4) translateY(-15%);
}

/* Scanning Overlay */
.sim-scan-overlay {
  position: absolute; inset: 0; z-index: 1001;
  background: rgba(10, 15, 26, 0.9);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity 0.3s;
}
.sim-scan-overlay.scanning {
  opacity: 1; pointer-events: all;
}
.sim-scanner-line {
  width: 100%; height: 2px; background: var(--accent-emerald);
  box-shadow: 0 0 15px var(--accent-emerald);
  position: absolute; top: 0;
  animation: scanSweep 2s linear infinite;
}
.sim-scan-text {
  color: var(--accent-emerald); font-family: 'Space Mono', monospace; font-size: 14px; margin-top: 20px;
  animation: pulse 1s infinite;
}
@keyframes scanSweep {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

/* Analytics Dashboard */
.sim-analytics {
  width: 500px;
  display: flex; flex-direction: column;
  background: #f9f9fa;
  overflow-y: auto;
}
.sim-tabs {
  display: flex; border-bottom: 1px solid var(--border); background: #fff;
}
.sim-tab {
  flex: 1; background: none; border: none; padding: 16px; font-weight: 600; cursor: pointer; color: var(--text-muted);
  border-bottom: 2px solid transparent; transition: all 0.2s;
}
.sim-tab.active {
  color: var(--accent-blue); border-bottom-color: var(--accent-blue);
}
.sim-tab-content {
  display: none; padding: 24px;
}
.sim-tab-content.active {
  display: block;
}

/* ABIL-style Grid & Cards */
.sim-grid {
  display: flex; flex-direction: column; gap: 16px;
}
.sim-card {
  background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  display: flex; flex-direction: column; gap: 12px;
}
.sim-card-hdr {
  display: flex; justify-content: space-between; align-items: center;
}
.sim-card-title {
  display: flex; align-items: center; gap: 10px; font-weight: 600; color: var(--text-dark);
}
.sim-icon {
  width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  color: var(--text-muted);
}
.sim-badge {
  font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;
}
.sim-badge.concern { background: #fee2e2; color: #b91c1c; } /* Red */
.sim-badge.watch { background: #fef3c7; color: #b45309; } /* Yellow */
.sim-badge.optimal { background: #d1fae5; color: #047857; } /* Green */

.sim-card-desc {
  font-size: 14px; color: var(--text-muted); line-height: 1.5;
}

/* Compare List */
.sim-compare-list {
  display: flex; flex-direction: column; gap: 20px;
}
.sim-compare-item {
  border-left: 3px solid var(--accent-blue); padding-left: 16px;
}
.sim-compare-item.negative { border-left-color: var(--accent-red); }
.sim-compare-item.positive { border-left-color: var(--accent-green); }
.sim-compare-title { font-weight: 600; margin-bottom: 6px; }
.sim-compare-desc { font-size: 14px; color: var(--text-muted); line-height: 1.5; }

/* Focus animation */
.site-search-wrapper input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
"""

with codecs.open("style.css", "a", encoding="utf-8") as f:
    f.write(site_intel_css)

print("style.css updated with Site Intel styles")
