import codecs
import re

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

# Add aiSendBtn listener
pattern = r"const aiCloseBtn = document.getElementById\('aiCloseBtn'\);\nconst aiInput = document.getElementById\('aiInput'\);\n"
replacement = """const aiCloseBtn = document.getElementById('aiCloseBtn');
const aiInput = document.getElementById('aiInput');
const aiSendBtn = document.getElementById('aiSendBtn');
"""

js = re.sub(pattern, replacement, js)

pattern_listeners = r"aiCloseBtn\.addEventListener\('click', \(\) => \{\n    aiWidgetPanel\.style\.display = 'none';\n  \}\);\n\}"
replacement_listeners = """aiCloseBtn.addEventListener('click', () => {
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

js = re.sub(pattern_listeners, replacement_listeners, js)

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("AI event listeners bound in app.js")
