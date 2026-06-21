import codecs
import re

with codecs.open("server.js", "r", encoding="utf-8") as f:
    server = f.read()

# 1. Fix Registration to persist to Firestore
old_reg_write = """  users.push(newUser);
  try {
    fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('[register] Failed to save user:', err.message);
    return res.status(500).json({ error: 'Failed to save registration' });
  }"""

new_reg_write = """  users.push(newUser);
  try {
    // Persist to Firestore (primary) and JSON fallback
    if (db) {
      await db.collection('users').doc(String(newUser.id)).set(newUser);
      console.log('[register] User saved to Firestore:', newUser.username);
    }
    fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('[register] Failed to save user:', err.message);
    return res.status(500).json({ error: 'Failed to save registration' });
  }"""

server = server.replace(old_reg_write, new_reg_write)

# 2. Fix Google Auth to persist to Firestore
old_google_write = """      users.push(newUser);
      // Persist the new user to disk
      try {
        fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
        console.log(`[google-auth] New user registered: ${newUser.email}`);
      } catch (writeErr) {
        console.error('[google-auth] Failed to persist new user:', writeErr.message);
      }"""

new_google_write = """      users.push(newUser);
      // Persist the new user to Firestore (primary) and disk fallback
      try {
        if (db) {
          await db.collection('users').doc(String(newUser.id)).set(newUser);
          console.log(`[google-auth] User saved to Firestore: ${newUser.email}`);
        }
        fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
        console.log(`[google-auth] New user registered: ${newUser.email}`);
      } catch (writeErr) {
        console.error('[google-auth] Failed to persist new user:', writeErr.message);
      }"""

server = server.replace(old_google_write, new_google_write)

# 3. Add activity logging endpoint
activity_endpoint = """
// ─── Activity Logging ────────────────────────────────────────
app.post('/api/activity/log', auth, async (req, res) => {
  const { action, details } = req.body || {};
  const logEntry = {
    userId: req.user.id,
    username: req.user.username,
    action: action || 'unknown',
    details: details || '',
    timestamp: new Date().toISOString()
  };
  try {
    if (db) {
      await db.collection('activity_logs').add(logEntry);
    }
    res.json({ logged: true });
  } catch (err) {
    console.error('[activity] Log failed:', err.message);
    res.json({ logged: false });
  }
});

// ─── Admin: Get Activity Logs ────────────────────────────────
app.get('/api/admin/activity', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    if (db) {
      const snapshot = await db.collection('activity_logs').orderBy('timestamp', 'desc').limit(100).get();
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ logs, total: logs.length });
    }
    res.json({ logs: [], total: 0, message: 'Firestore not available' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve activity logs' });
  }
});

"""

# Insert activity logging before the catch-all route
server = server.replace("app.get('/api/seed',", activity_endpoint + "app.get('/api/seed',")

with codecs.open("server.js", "w", encoding="utf-8") as f:
    f.write(server)

print("server.js updated with Firestore persistence and activity logging")
