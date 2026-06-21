import sys
import codecs

with codecs.open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

new_css = """
/* ─── DEDICATED SITE INTELLIGENCE PAGE ─── */
.si-tab-btn { background: none; border: none; padding: 12px 24px; font-weight: 600; cursor: pointer; color: var(--text-muted); border-bottom: 2px solid transparent; transition: all 0.2s; font-size: 15px; }
.si-tab-btn.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); }
.si-map-btn { background: none; border: none; padding: 8px 16px; font-weight: 600; cursor: pointer; color: var(--text-muted); }
.si-map-btn.active { background: var(--accent-blue); color: #fff; }
.si-map-panel.mode-3d #siMapWrapper { transform: perspective(1200px) rotateX(60deg) scale(1.4) translateY(-15%); }

.si-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px; }
.si-card-hdr { display: flex; justify-content: space-between; align-items: center; }
.si-card-title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-dark); font-size: 14px;}
.si-icon { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; color: var(--text-muted); }
.si-badge { font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.si-badge.concern { background: #fee2e2; color: #b91c1c; }
.si-badge.watch { background: #fef3c7; color: #b45309; }
.si-badge.optimal { background: #d1fae5; color: #047857; }
.si-card-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

.si-compare-item { border-left: 3px solid var(--accent-blue); padding-left: 16px; }
.si-compare-item.negative { border-left-color: var(--accent-red); }
.si-compare-item.positive { border-left-color: var(--accent-green); }
.si-compare-title { font-weight: 600; margin-bottom: 4px; font-size: 14px;}
.si-compare-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

.si-reg-item { border: 1px solid var(--border); border-radius: 6px; padding: 12px; }
.si-reg-title { font-weight: 600; display:flex; justify-content:space-between; font-size:14px; margin-bottom: 6px;}
.si-reg-status.compliant { color: var(--accent-green); }
.si-reg-status.warning { color: var(--accent-amber); }

@keyframes scanSweep {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
"""

with codecs.open("style.css", "a", encoding="utf-8") as f:
    f.write(new_css)

print("style.css updated safely")
