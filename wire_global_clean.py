import codecs
import re

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"document\.getElementById\('globalSearch'\)\.addEventListener\('input', async function\(\) \{\s*// Could wire to /api/search \? for now just visual feedback\s*\}\);"

replacement = """const globalSearch = document.getElementById('globalSearch');
if (globalSearch) {
  globalSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = globalSearch.value.trim();
      if (query) {
        document.querySelector('[data-page="site-intelligence"]').click();
        setTimeout(() => {
          document.getElementById('siSearchInput').value = query;
          analyzeRegion(query);
          globalSearch.value = '';
        }, 300);
      }
    }
  });
}"""

js_new = re.sub(pattern, replacement, js, flags=re.DOTALL)

if js_new != js:
    with codecs.open("app.js", "w", encoding="utf-8") as f:
        f.write(js_new)
    print("Global Search wired successfully via clean Regex.")
else:
    print("Regex target STILL not found.")

with codecs.open("index.html", "r", encoding="utf-8") as f:
    html = f.read()
html = re.sub(r'app\.js\?v=\d+', 'app.js?v=13', html)
with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
