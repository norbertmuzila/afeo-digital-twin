import sys
import codecs

with codecs.open("index.html", "r", encoding="utf-8") as f:
    code = f.read()

splash_html = """<body>
  <!-- ─── SPLASH SCREEN INTRO ─── -->
  <div id="splashScreen">
    <div class="splash-logo">
      <span class="waf-w splash-letter">W</span>
      <span class="waf-a splash-letter">A</span>
      <span class="waf-f splash-letter">F</span>
      <span class="waf-e splash-letter">E</span>
      <span class="waf-o splash-letter">O</span>
    </div>
  </div>
"""

code = code.replace("<body>", splash_html)

with codecs.open("index.html", "w", encoding="utf-8") as f:
    f.write(code)

print("index.html splash screen added")
