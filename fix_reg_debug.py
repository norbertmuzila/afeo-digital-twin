import codecs

with codecs.open("server.js", "r", encoding="utf-8") as f:
    server = f.read()

# Wrap registration persistence in more detailed error logging
old_persist = """  try {
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

new_persist = """  try {
    // Persist to Firestore (primary)
    if (db) {
      await db.collection('users').doc(String(newUser.id)).set(newUser);
      console.log('[register] User saved to Firestore:', newUser.username);
    } else {
      // Fallback: write to local JSON (only works in non-serverless environments)
      fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
    }
  } catch (err) {
    console.error('[register] Failed to save user:', err.message, err.stack);
    return res.status(500).json({ error: 'Failed to save registration: ' + err.message });
  }"""

server = server.replace(old_persist, new_persist)

# Also add a safety check for the duplicate username lookup (handle missing username field)
old_dup_check = """  // Check for duplicate username or email
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already registered' });
  }"""

new_dup_check = """  // Check for duplicate username or email
  if (users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already registered' });
  }"""

server = server.replace(old_dup_check, new_dup_check)

with codecs.open("server.js", "w", encoding="utf-8") as f:
    f.write(server)

print("server.js registration error logging improved")
