import codecs, re

with codecs.open("index.html", "r", encoding="utf-8") as f:
    html = f.read()
html = re.sub(r'style\.css\?v=\d+', 'style.css?v=14', html)
html = re.sub(r'app\.js\?v=\d+', 'app.js?v=14', html)
with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Cache bumped to v=14")
