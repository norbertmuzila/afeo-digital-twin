import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "document.getElementById('globalSearch').addEventListener('input'" in line:
        skip = True
        new_lines.append("""const globalSearch = document.getElementById('globalSearch');
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
}
""")
        continue
    if skip:
        if "});" in line:
            skip = False
        continue
    new_lines.append(line)

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Global search wired successfully by line-by-line parsing.")
