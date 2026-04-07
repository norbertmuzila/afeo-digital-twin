import os
import re

source_file = r"c:\Users\Ramsy\Downloads\AfEO WebApp\afeo-model-preview.html"
target_dir = r"c:\Users\Ramsy\.gemini\antigravity\playground\terravue-digital-twin"

with open(source_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract styles
style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)
if style_match:
    styles = style_match.group(1).strip()
    with open(os.path.join(target_dir, 'style.css'), 'w', encoding='utf-8') as f:
        f.write(styles)

# Extract scripts
script_match = re.search(r'<script>(.*?)</script>', content, re.DOTALL | re.IGNORECASE)
if script_match:
    scripts = script_match.group(1).strip()
    with open(os.path.join(target_dir, 'app.js'), 'w', encoding='utf-8') as f:
        f.write(scripts)

# Create index.html
html_content = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="style.css">', content, flags=re.DOTALL | re.IGNORECASE)
html_content = re.sub(r'<script>.*?</script>', '<script src="app.js"></script>', html_content, flags=re.DOTALL | re.IGNORECASE)

with open(os.path.join(target_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Split completed successfully!")
