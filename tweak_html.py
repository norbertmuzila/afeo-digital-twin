import codecs
import re

with codecs.open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Reduce Site Intel Search Box size
html = html.replace('class="site-search-wrapper" style="position:relative; width:400px;"', 'class="site-search-wrapper" style="position:relative; width:260px;"')

# 2. Make Theme Button smaller
html = html.replace('<div class="hdr-btn" id="themeToggle" title="Toggle Light/Dark Theme">🌙</div>', '<div class="hdr-btn" id="themeToggle" title="Toggle Light/Dark Theme" style="width:28px; height:28px; font-size:12px;">🌙</div>')

# 3. Update AI Widget to include Disclaimer
old_ai_input = """<div style="padding: 12px; border-top: 1px solid var(--border); background: #fff; display:flex; gap: 8px; align-items:center;">
          <input type="text" id="aiInput" placeholder="Ask securely..." style="flex:1; padding: 10px 14px; border-radius: 20px; border: 1px solid #dcdcdc; outline:none; font-family:inherit; font-size: 13px; background: #f9f9f9;">
          <button id="aiSendBtn" style="padding: 10px 16px; border-radius: 20px; border:none; background: var(--accent-blue); color:#fff; font-weight:bold; cursor:pointer; transition: background 0.2s;">Send 🚀</button>
        </div>"""

new_ai_input = """<div style="padding: 12px 12px 8px 12px; border-top: 1px solid var(--border); background: #fff; display:flex; flex-direction:column; gap: 8px;">
          <div style="display:flex; gap: 8px; align-items:center; width: 100%;">
            <input type="text" id="aiInput" placeholder="Ask securely..." style="flex:1; padding: 10px 14px; border-radius: 20px; border: 1px solid #dcdcdc; outline:none; font-family:inherit; font-size: 13px; background: #f9f9f9;">
            <button id="aiSendBtn" style="padding: 10px 16px; border-radius: 20px; border:none; background: var(--accent-blue); color:#fff; font-weight:bold; cursor:pointer; transition: background 0.2s;">Send 🚀</button>
          </div>
          <div style="font-size: 10px; color: #888; font-style: italic; text-align: center; margin-top:-2px;">
            This AI assistant can make mistakes, please always verify critical data and metrics.
          </div>
        </div>"""

html = html.replace(old_ai_input, new_ai_input)

# Cache bump
html = re.sub(r'style\.css\?v=\d+', 'style.css?v=9', html)
html = re.sub(r'app\.js\?v=\d+', 'app.js?v=9', html)

with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("index.html updated successfully")
