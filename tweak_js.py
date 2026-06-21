import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

# 1. Add toggleTheme function
theme_logic = """
function toggleTheme() {
  document.documentElement.classList.toggle('dark-theme');
  const btn = document.getElementById('themeToggle');
  if (document.documentElement.classList.contains('dark-theme')) {
    btn.textContent = '☀️';
  } else {
    btn.textContent = '🌙';
  }
}
"""
if "function toggleTheme" not in js:
    js += "\n" + theme_logic

# 2. Update AI Thinking message
old_thinking = "appendChatMsg('bot', '🤖', 'Thinking...', typingId);"
new_thinking = "appendChatMsg('bot', '🤖', '<em>Thinking...</em>', typingId);"
js = js.replace(old_thinking, new_thinking)

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("app.js updated successfully")
