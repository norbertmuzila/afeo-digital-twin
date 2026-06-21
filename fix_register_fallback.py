import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if "Backend unreachable. Simulating successful registration." in line:
        new_lines.append("    console.error('Backend unreachable:', err);\n")
        continue
    if "Demo Account created! You can now log in." in line:
        new_lines.append("    errEl.textContent = 'Server connection failed. Please check your internet and try again.';\n")
        continue
    if "errEl.className = 'register-success'" in line and i > 280 and i < 300:
        new_lines.append("    errEl.className = 'register-error';\n")
        continue
    new_lines.append(line)

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Registration fallback fixed to show error instead of fake success")
