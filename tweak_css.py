import codecs
import re

with codecs.open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

# 1. Reduce search box width
css = re.sub(r'width:\s*260px;', 'width: 200px;', css)

# 2. Add Dark Theme variables
dark_theme = """
:root.dark-theme {
  --bg-primary: #0f111a;
  --bg-secondary: #1a1d2d;
  --bg-tertiary: #24283b;
  --text-primary: #c0caf5;
  --text-secondary: #a9b1d6;
  --text-muted: #565f89;
  --border: #292e42;
  --bg-light: #16161e;
  --accent-blue: #7aa2f7;
}
"""

if ":root.dark-theme" not in css:
    css += "\n" + dark_theme

with codecs.open("style.css", "w", encoding="utf-8") as f:
    f.write(css)

print("style.css updated for theme and search box size")
