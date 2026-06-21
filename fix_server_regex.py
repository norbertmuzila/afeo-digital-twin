import codecs
import re

with codecs.open("server.js", "r", encoding="utf-8") as f:
    js = f.read()

# Normalize line endings to avoid \r\n vs \n issues
js = js.replace("\r\n", "\n")

# 1. Fix Registration (Add try-catch, fix duplicate check, add Firestore write, fix ID)
# Pattern to find the start of the register route
pattern1 = r"app\.post\('/api/auth/register', async \(req, res\) => \{(.*?)\n\s+const { password: _pw, \.\.\.safeUser } = newUser;"

def replace_reg(m):
    body = m.group(1)
    # Fix ID
    body = re.sub(r"id: users\.length \+ 1,", "id: users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1,", body)
    
    # Fix duplicate check
    body = re.sub(r"if \(users\.find\(u => u\.username\.toLowerCase\(\)", "if (users.find(u => u.username && u.username.toLowerCase()", body)
    
    # Fix persistence
    old_persist = r"""  users\.push\(newUser\);\n\s*try \{\n\s*fs\.writeFileSync\(dataPath\('users\.json'\), JSON\.stringify\(users, null, 2\)\);\n\s*\} catch \(err\) \{\n\s*console\.error\('\[register\] Failed to save user:', err\.message\);\n\s*return res\.status\(500\)\.json\(\{ error: 'Failed to save registration' \}\);\n\s*\}"""
    
    new_persist = """  users.push(newUser);
  try {
    if (db) {
      await db.collection('users').doc(String(newUser.id)).set(newUser);
    } else {
      fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
    }
  } catch (err) {
    console.error('[register] Failed to save user:', err.message);
    return res.status(500).json({ error: 'Failed to save registration: ' + err.message });
  }"""
    
    body = re.sub(old_persist, new_persist, body, flags=re.DOTALL)
    
    return "app.post('/api/auth/register', async (req, res) => {\n  try {\n" + body + "\n  const { password: _pw, ...safeUser } = newUser;"

js = re.sub(pattern1, replace_reg, js, flags=re.DOTALL)

# Find the end of register route to close the top-level try-catch
pattern2 = r"  res\.status\(201\)\.json\(\{ token, user: safeUser \}\);\n\});"
new_end2 = """  res.status(201).json({ token, user: safeUser });
  } catch (topErr) {
    console.error('[register] Top level error:', topErr.message);
    res.status(500).json({ error: 'Registration crashed: ' + topErr.message });
  }
});"""
js = re.sub(pattern2, new_end2, js)

# 2. Fix Google Auth (add Firestore write, fix ID)
pattern_google = r"    if \(!user\) \{(.*?)\n\s+user = newUser;\n\s+\}"

def replace_google(m):
    body = m.group(1)
    # Fix ID
    body = re.sub(r"id: users\.length \+ 1,", "id: users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1,", body)
    
    # Fix persistence
    old_persist = r"""      users\.push\(newUser\);\n\s*// Persist the new user to disk\n\s*try \{\n\s*fs\.writeFileSync\(dataPath\('users\.json'\), JSON\.stringify\(users, null, 2\)\);\n\s*console\.log\(`\[google-auth\] New user registered: \$\{newUser\.email\}`\);\n\s*\} catch \(writeErr\) \{\n\s*console\.error\('\[google-auth\] Failed to persist new user:', writeErr\.message\);\n\s*\}"""
    
    new_persist = """      users.push(newUser);
      try {
        if (db) {
          await db.collection('users').doc(String(newUser.id)).set(newUser);
        } else {
          fs.writeFileSync(dataPath('users.json'), JSON.stringify(users, null, 2));
        }
        console.log(`[google-auth] New user registered: ${newUser.email}`);
      } catch (writeErr) {
        console.error('[google-auth] Failed to persist new user:', writeErr.message);
      }"""
    
    body = re.sub(old_persist, new_persist, body, flags=re.DOTALL)
    return "    if (!user) {" + body + "\n      user = newUser;\n    }"

js = re.sub(pattern_google, replace_google, js, flags=re.DOTALL)

# Save back
with codecs.open("server.js", "w", encoding="utf-8") as f:
    f.write(js)

print("server.js correctly patched using regex!")
