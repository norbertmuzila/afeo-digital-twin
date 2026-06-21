import codecs

with codecs.open("server.js", "r", encoding="utf-8") as f:
    server = f.read()

# Fix Registration: Use Firestore first, fs.writeFileSync as optional fallback
old_reg = """  users.push(newUser);
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

new_reg = """  users.push(newUser);
  try {
    // Persist to Firestore (primary)
    if (db) {
      await db.collection('users').doc(String(newUser.id)).set(newUser);
      console.log('[register] User saved to Firestore:', newUser.username);
    } else {
      // Fallback: write to local JSON (only works in non-serverless environments)
      fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
    }
  } catch (err) {
    console.error('[register] Failed to save user:', err.message);
    return res.status(500).json({ error: 'Failed to save registration' });
  }"""

server = server.replace(old_reg, new_reg)

# Fix Google Auth: Same pattern
old_google = """      users.push(newUser);
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

new_google = """      users.push(newUser);
      // Persist the new user to Firestore (primary)
      try {
        if (db) {
          await db.collection('users').doc(String(newUser.id)).set(newUser);
          console.log(`[google-auth] User saved to Firestore: ${newUser.email}`);
        } else {
          fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
        }
        console.log(`[google-auth] New user registered: ${newUser.email}`);
      } catch (writeErr) {
        console.error('[google-auth] Failed to persist new user:', writeErr.message);
      }"""

server = server.replace(old_google, new_google)

with codecs.open("server.js", "w", encoding="utf-8") as f:
    f.write(server)

print("server.js fixed: Firestore-first persistence, fs as fallback only")
