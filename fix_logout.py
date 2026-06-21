import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]

    # Replace doLogout
    if 'function doLogout()' in line:
        new_lines.append("""function doLogout() {
  // Log activity before clearing token
  if (authToken && authToken !== 'google-local-token') {
    try {
      fetch(API + '/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ action: 'logout', details: 'User logged out' })
      });
    } catch(e) {}
  }
  authToken = null; currentUser = null;
  document.getElementById('appShell').classList.remove('on');
  setTimeout(() => { document.getElementById('loginScreen').classList.remove('out'); }, 400);
  // Clear login fields
  document.getElementById('inUser').value = '';
  document.getElementById('inPass').value = '';
  const errEl = document.getElementById('loginError');
  if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }
}
""")
        # Skip the old function body
        brace_count = 0
        started = False
        while i < len(lines):
            if '{' in lines[i]:
                brace_count += lines[i].count('{')
                started = True
            if '}' in lines[i]:
                brace_count -= lines[i].count('}')
            i += 1
            if started and brace_count <= 0:
                break
        continue

    new_lines.append(line)
    i += 1

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("doLogout replaced successfully")
