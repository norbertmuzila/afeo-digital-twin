import codecs

with codecs.open("server.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False

google_auth_new = """// ─── Auth: Google Sign-In ────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: 'Google credential (id_token) required' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID, 
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Google email is not verified. Please verify your email first.' });
    }

    const users = await readData('users.json');
    if (!users) return res.status(500).json({ error: 'User store unavailable' });

    let user = users.find(u => u.email && u.email.toLowerCase() === payload.email.toLowerCase());
    
    if (!user) {
      const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
      const newUser = {
        id: maxId + 1,
        username: payload.email.split('@')[0],
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        role: 'researcher', 
        password: '', 
        googleId: payload.sub,
        picture: payload.picture || '',
        authProvider: 'google',
        registeredAt: new Date().toISOString()
      };
      users.push(newUser);
      try {
        if (db) {
          await db.collection('users').doc(String(newUser.id)).set(newUser);
          console.log(`[google-auth] User saved to Firestore: ${newUser.email}`);
        } else {
          fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
        }
      } catch (writeErr) {
        console.error('[google-auth] Failed to persist new user:', writeErr.message);
      }
      user = newUser;
    }

    const jwtToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { password: _pw, ...safeUser } = user;
    res.json({ token: jwtToken, user: safeUser });
    
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google authentication failed. Please try again.' });
  }
});
"""

register_new = """// ─── Auth: Registration (Email-based) ────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, username, password, region } = req.body || {};
    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required (name, email, username, password)' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const users = await readData('users.json');
    if (!users) return res.status(500).json({ error: 'User store unavailable' });

    if (users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
    const newUser = {
      id: maxId + 1,
      username,
      email,
      name,
      password: hashPassword(password),
      role: 'researcher',
      region: region || 'Global',
      registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    
    if (db) {
      await db.collection('users').doc(String(newUser.id)).set(newUser);
    } else {
      fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
    }

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { password: _pw, ...safeUser } = newUser;
    res.status(201).json({ token, user: safeUser });
  } catch (topErr) {
    console.error('[register] error:', topErr);
    res.status(500).json({ error: 'Registration failed: ' + topErr.message });
  }
});
"""

i = 0
while i < len(lines):
    line = lines[i]
    if "app.post('/api/auth/google'" in line:
        new_lines.append(google_auth_new)
        # Skip until end of route
        while i < len(lines):
            if "});" in lines[i] and "catch (err)" not in lines[i-3:i]:
                # Need to be careful here, safer to just find the exact next route
                break
            i += 1
        # Skip down to Registration
        while i < len(lines):
            if "app.post('/api/auth/register'" in lines[i]:
                break
            i += 1
        continue
        
    if "app.post('/api/auth/register'" in line:
        new_lines.append(register_new)
        # Skip until Admin route
        while i < len(lines):
            if "app.get('/api/admin/users'" in lines[i]:
                new_lines.append(lines[i])
                break
            i += 1
        i += 1
        continue
        
    new_lines.append(line)
    i += 1

with codecs.open("server.js", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("server.js hard-patched.")
