import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

target = """// ─── GLOBAL SEARCH ───
document.getElementById('globalSearch').addEventListener('input', async function() {
  // Could wire to /api/search ? for now just visual feedback
});"""

replacement = """// ─── GLOBAL SEARCH ───
const globalSearch = document.getElementById('globalSearch');
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

if target in js:
    js = js.replace(target, replacement)
    with codecs.open("app.js", "w", encoding="utf-8") as f:
        f.write(js)
    print("Global Search wired to SI Engine.")
else:
    print("Target not found.")

