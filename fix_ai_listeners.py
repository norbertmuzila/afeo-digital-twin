import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

target = """const aiFabBtn = document.getElementById('aiFabBtn');
const aiWidgetPanel = document.getElementById('aiWidgetPanel');
const aiCloseBtn = document.getElementById('aiCloseBtn');
const aiInput = document.getElementById('aiInput');

if (aiFabBtn && aiWidgetPanel && aiCloseBtn) {
  aiFabBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = aiWidgetPanel.style.display === 'flex' ? 'none' : 'flex';
    if (aiWidgetPanel.style.display === 'flex') aiInput.focus();
  });
  aiCloseBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = 'none';
  });
}"""

replacement = """const aiFabBtn = document.getElementById('aiFabBtn');
const aiWidgetPanel = document.getElementById('aiWidgetPanel');
const aiCloseBtn = document.getElementById('aiCloseBtn');
const aiInput = document.getElementById('aiInput');
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

if target in js:
    js = js.replace(target, replacement)
    with codecs.open("app.js", "w", encoding="utf-8") as f:
        f.write(js)
    print("AI listeners successfully bound.")
else:
    print("Target string not found.")
