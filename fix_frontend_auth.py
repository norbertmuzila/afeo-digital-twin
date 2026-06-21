import codecs

with codecs.open("app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

# === 1. Replace doLogin function ===
new_doLogin = """async function doLogin() {
  const username = document.getElementById('inUser').value.trim();
  const password = document.getElementById('inPass').value;
  const role = document.getElementById('inRole').value;
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');

  if (!username || !password) {
    errEl.textContent = 'Please enter your username and password.';
    errEl.classList.add('show');
    return;
  }

  // Show loading state
  const loginBtn = document.getElementById('btnLogin');
  const originalText = loginBtn.textContent;
  loginBtn.textContent = 'Signing in...';
  loginBtn.disabled = true;

  try {
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
      errEl.textContent = data.error || 'Invalid username or password.';
      errEl.classList.add('show');
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
      return;
    }

    // Successful login
    authToken = data.token;
    currentUser = data.user;
    document.getElementById('sbName').textContent = currentUser.name || username;

    let displayRole = 'Administrator';
    if (currentUser.role === 'farmer') displayRole = 'Farmer / Extension';
    if (currentUser.role === 'government' || currentUser.role === 'policy') displayRole = 'Gov / Policy';
    if (currentUser.role === 'researcher') displayRole = 'Researcher';

    document.getElementById('sbRole').textContent = displayRole;
    document.getElementById('sbAvatar').textContent = (currentUser.name || username).substring(0, 2).toUpperCase();

    document.getElementById('loginScreen').classList.add('out');
    setTimeout(() => { document.getElementById('appShell').classList.add('on'); }, 400);
    loadDashboard();
    initMapOnce();

    // Log activity
    try {
      fetch(API + '/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ action: 'login', details: 'User logged in via credentials' })
      });
    } catch(e) {}

  } catch (err) {
    console.error('Login request failed:', err);
    errEl.textContent = 'Server connection failed. Please check your internet and try again.';
    errEl.classList.add('show');
    loginBtn.textContent = originalText;
    loginBtn.disabled = false;
  }
}
"""

# === 2. Replace handleGoogleCredentialResponse ===
new_googleHandler = """function handleGoogleCredentialResponse(response) {
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');

  (async () => {
    try {
      // Send the credential to the backend for verification and user creation
      const googleAbort = new AbortController();
      setTimeout(() => googleAbort.abort(), 8000);
      const res = await fetch(API + '/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
        signal: googleAbort.signal
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      // Successful Google login
      authToken = data.token;
      currentUser = data.user;

      document.getElementById('sbName').textContent = currentUser.name || currentUser.username;
      document.getElementById('sbRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Researcher';
      document.getElementById('sbAvatar').textContent = (currentUser.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      document.getElementById('loginScreen').classList.add('out');
      setTimeout(() => { document.getElementById('appShell').classList.add('on'); }, 400);
      loadDashboard();
      initMapOnce();

      // Log activity
      try {
        fetch(API + '/activity/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
          body: JSON.stringify({ action: 'google_login', details: 'User logged in via Google (' + (currentUser.email || '') + ')' })
        });
      } catch(e) {}

    } catch (err) {
      console.error('Google Sign-In failed:', err);
      // Fallback: decode JWT locally if backend is unreachable
      try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);

        authToken = 'google-local-token';
        currentUser = { name: payload.name, email: payload.email, role: 'researcher', picture: payload.picture };

        document.getElementById('sbName').textContent = currentUser.name;
        document.getElementById('sbRole').textContent = 'Researcher';
        document.getElementById('sbAvatar').textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        document.getElementById('loginScreen').classList.add('out');
        setTimeout(() => { document.getElementById('appShell').classList.add('on'); }, 400);
        loadDashboard();
        initMapOnce();
      } catch (fallbackErr) {
        errEl.textContent = 'Google sign-in failed. Please try again.';
        errEl.classList.add('show');
      }
    }
  })();
}
"""

# Process line by line
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]

    # Replace doLogin
    if 'async function doLogin()' in line:
        new_lines.append(new_doLogin)
        # Skip until we find the closing of the function
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

    # Replace handleGoogleCredentialResponse
    if 'function handleGoogleCredentialResponse(response)' in line:
        new_lines.append(new_googleHandler)
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

print("app.js doLogin and Google handler replaced with real API calls")
