import sys
import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Splash Screen Logic on window load
splash_js = """// ─── SPLASH SCREEN INTRO ───
window.addEventListener('load', () => {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    // The total animation takes ~1.3s (0.7s delay + 0.6s fade in). Hold for another 1s.
    setTimeout(() => {
      splash.classList.add('slide-up');
      // Remove from DOM after transition completes to prevent blocking interaction
      setTimeout(() => {
        splash.style.display = 'none';
      }, 800);
    }, 2000); // Wait 2 seconds before sliding up
  }
});

"""

# Insert at the very beginning after imports/consts
code = code.replace("let authToken = null;", splash_js + "let authToken = null;")

# 2. Wire up WAFEO AI
ai_wire_old = """if (aiFabBtn && aiWidgetPanel && aiCloseBtn) {
  aiFabBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = aiWidgetPanel.style.display === 'flex' ? 'none' : 'flex';
    if (aiWidgetPanel.style.display === 'flex') aiInput.focus();
  });
  aiCloseBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = 'none';
  });
}"""

ai_wire_new = """if (aiFabBtn && aiWidgetPanel && aiCloseBtn) {
  aiFabBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = aiWidgetPanel.style.display === 'flex' ? 'none' : 'flex';
    if (aiWidgetPanel.style.display === 'flex') aiInput.focus();
  });
  aiCloseBtn.addEventListener('click', () => {
    aiWidgetPanel.style.display = 'none';
  });
  
  const aiSendBtn = document.getElementById('aiSendBtn');
  if (aiInput && aiSendBtn) {
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleUserMsg();
    });
    aiSendBtn.addEventListener('click', handleUserMsg);
  }
}"""

code = code.replace(ai_wire_old, ai_wire_new)

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.write(code)

print("app.js updated with splash logic and AI wiring")
