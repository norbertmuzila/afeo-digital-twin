import codecs
import re

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

# Using regex to bypass CRLF issues
pattern = r"const aiInput = document\.getElementById\('aiInput'\);.*?if \(aiFabBtn && aiWidgetPanel && aiCloseBtn\) \{.*?aiCloseBtn\.addEventListener\('click', \(\) => \{\s*aiWidgetPanel\.style\.display = 'none';\s*\}\);\s*\}"

replacement = """const aiInput = document.getElementById('aiInput');
const aiSendBtn = document.getElementById('aiSendBtn');

if (aiFabBtn && aiWidgetPanel && aiCloseBtn) {
  aiFabBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = aiWidgetPanel.style.display === 'flex' ? 'none' : 'flex';
    if (aiWidgetPanel.style.display === 'flex') aiInput.focus();
  });
  aiCloseBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = 'none';
  });
  if (aiSendBtn) {
    aiSendBtn.addEventListener('click', handleUserMsg);
  }
  if (aiInput) {
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleUserMsg();
    });
  }
}"""

js_new = re.sub(pattern, replacement, js, flags=re.DOTALL)

if js_new != js:
    with codecs.open("app.js", "w", encoding="utf-8") as f:
        f.write(js_new)
    print("AI listeners successfully bound.")
else:
    print("Target string not found with regex.")

# Also bump the cache version in index.html to make sure browser pulls the new app.js
with codecs.open("index.html", "r", encoding="utf-8") as f:
    html = f.read()
html = re.sub(r'app\.js\?v=\d+', 'app.js?v=11', html)
with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
