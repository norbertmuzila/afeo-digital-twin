import codecs

with codecs.open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

report_css = """
/* ─── WAFEO REPORT MODAL & SPLIT SLIDER ─── */
.wafeo-modal {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85); z-index: 9999;
  display: flex; justify-content: center; align-items: center;
  backdrop-filter: blur(8px);
  padding: 20px;
}
.report-content {
  background: var(--bg-surface);
  border-radius: 12px;
  width: 100%; max-width: 900px; max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid var(--border);
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

.report-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 16px;
  background: var(--bg-deep);
}
.rh-logo {
  background: var(--accent-emerald); color: #fff;
  font-weight: 800; font-size: 14px; padding: 4px 10px;
  border-radius: 4px; letter-spacing: 1px;
}
.report-header h2 { margin: 0; font-size: 18px; color: var(--text-primary); flex: 1; }
.close-report { background: none; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer; transition: color 0.2s; }
.close-report:hover { color: var(--accent-red); }

.report-body { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
.report-summary h3 { margin: 0 0 8px 0; color: var(--text-primary); font-size: 16px; }
.report-summary p { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6; }

/* Tabs */
.report-tabs { display: flex; gap: 10px; border-bottom: 2px solid var(--border); padding-bottom: 10px; }
.rt-btn {
  background: none; border: none; padding: 8px 16px;
  font-size: 14px; font-weight: 600; color: var(--text-muted);
  cursor: pointer; border-radius: 6px; transition: all 0.2s;
}
.rt-btn:hover { background: var(--bg-deep); color: var(--text-primary); }
.rt-btn.active { background: var(--accent-emerald); color: #fff; }

/* Split Slider */
.split-slider-container {
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
  user-select: none;
}
.ss-img {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%; object-fit: cover;
  pointer-events: none;
}
.ss-img-over-wrapper {
  position: absolute; top: 0; left: 0;
  width: 50%; height: 100%;
  overflow: hidden;
  border-right: 3px solid #fff;
  box-shadow: 2px 0 15px rgba(0,0,0,0.5);
  pointer-events: none;
}
.ss-img-over { width: 100vw; max-width: 850px; } /* Must match container width */

.ss-range {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  margin: 0; opacity: 0; cursor: ew-resize;
  z-index: 10;
}
.ss-handle {
  position: absolute; top: 0; bottom: 0; left: 50%;
  width: 2px;
  transform: translateX(-50%);
  pointer-events: none; z-index: 5;
}
.ss-handle-button {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: #fff; color: #000;
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; justify-content: center; align-items: center;
  font-size: 12px; font-weight: bold; font-family: monospace;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
}
.ss-label {
  position: absolute; bottom: 16px;
  background: rgba(0,0,0,0.6); color: #fff;
  padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;
  backdrop-filter: blur(4px); pointer-events: none;
}
.ss-label-left { left: 16px; }
.ss-label-right { right: 16px; }

/* Data Grid */
.report-data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.rd-box { background: var(--bg-deep); padding: 16px; border-radius: 8px; text-align: center; border: 1px solid var(--border); }
.rd-box h4 { margin: 0 0 8px 0; font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.rd-val { font-size: 24px; font-weight: 700; }
.rd-val.negative { color: var(--accent-red); }
.rd-val.positive { color: var(--accent-emerald); }
.rd-val.warning { color: var(--accent-orange); }

"""

with codecs.open("style.css", "w", encoding="utf-8") as f:
    f.write(css + "\n" + report_css)
print("style.css patched with Report Slider styles")
