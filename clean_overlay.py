import sys
import codecs

# 1. Clean index.html
with codecs.open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Remove the broken search bar
if '<div class="tb-center"' in html:
    start_idx = html.find('<div class="tb-center"')
    end_idx = html.find('</div>\n        </div>\n', start_idx) + 24
    if start_idx != -1 and end_idx != -1:
        html = html[:start_idx] + html[end_idx:]

# Remove the Site Intel Modal overlay
if '<!-- ─── SITE INTELLIGENCE MODAL ─── -->' in html:
    start_idx = html.find('<!-- ─── SITE INTELLIGENCE MODAL ─── -->')
    end_idx = html.find('<!--  FLOATING AI WIDGET  -->')
    if start_idx != -1 and end_idx != -1:
        html = html[:start_idx] + html[end_idx:]

with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

# 2. Clean style.css
with codecs.open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

if '/* ─── SITE INTELLIGENCE MODAL ─── */' in css:
    start_idx = css.find('/* ─── SITE INTELLIGENCE MODAL ─── */')
    css = css[:start_idx]

with codecs.open("style.css", "w", encoding="utf-8") as f:
    f.write(css)

# 3. Clean app.js
with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

if '// ─── SITE INTELLIGENCE ENGINE ───' in js:
    start_idx = js.find('// ─── SITE INTELLIGENCE ENGINE ───')
    js = js[:start_idx]

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Cleaned up old broken overlay logic.")
