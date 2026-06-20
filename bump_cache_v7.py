import sys
import codecs

with codecs.open("index.html", "r", encoding="utf-8") as f:
    code = f.read()

# Bump cache busters to force browser reload
code = code.replace('style.css?v=3', 'style.css?v=4')
code = code.replace('app.js?v=6', 'app.js?v=7')

with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(code)

print("Cache busters bumped in index.html to v7")
