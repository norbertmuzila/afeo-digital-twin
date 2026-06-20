import sys
import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update API URL
old_api = "const API = 'https://wafeo.up.railway.app/api';"
new_api = """// Dynamic API URL: relative on Vercel, full URL on GitHub Pages
const API = window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost'
  ? '/api'
  : 'https://wafeo.vercel.app/api';"""

code = code.replace(old_api, new_api)

# 2. Update doLogin() to use the actual backend
old_login = """  // Frontend-only authentication for GitHub Pages
  console.log('Logging in via Frontend Mode');
  authToken = 'demo-token';
  currentUser = { name: username || 'Demo User', role: role || 'admin' };
  document.getElementById('sbName').textContent = currentUser.name;
  
  let displayRole = 'Administrator';
  if (role === 'farmer') displayRole = 'Farmer / Extension';
  if (role === 'government') displayRole = 'Gov / Policy';
  if (role === 'researcher') displayRole = 'Researcher';
  
  document.getElementById('sbRole').textContent = displayRole;
  document.getElementById('sbAvatar').textContent = currentUser.name.substring(0, 2).toUpperCase();

  document.getElementById('loginScreen').classList.add('out');
  setTimeout(() => { document.getElementById('appShell').classList.add('on'); }, 400);
  loadDashboard();
  initMapOnce();"""

new_login = """  try {
    const loginAbort = new AbortController();
    setTimeout(() => loginAbort.abort(), 5000);
    const res = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: loginAbort.signal
    });
    const data = await res.json();
    if (!res.ok) { 
      errEl.textContent = data.error || 'Invalid credentials. Please try again.'; 
      errEl.classList.add('show'); 
      return; 
    }

    authToken = data.token;
    currentUser = data.user;
    document.getElementById('sbName').textContent = data.user.name;
    document.getElementById('sbRole').textContent = data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1);
    document.getElementById('sbAvatar').textContent = data.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    document.getElementById('loginScreen').classList.add('out');
    setTimeout(() => { document.getElementById('appShell').classList.add('on'); }, 400);
    loadDashboard();
    initMapOnce();
  } catch (err) {
    console.error('Login error:', err);
    errEl.textContent = 'Network error connecting to backend. Please try again.';
    errEl.classList.add('show');
  }"""

code = code.replace(old_login, new_login)

with codecs.open("app.js", "w", encoding="utf-8") as f:
    f.write(code)

print("app.js completely fixed and restored")
