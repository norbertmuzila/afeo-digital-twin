import codecs

with codecs.open("server.js", "r", encoding="utf-8") as f:
    server = f.read()

# Wrap the entire register route in a top-level try-catch
old_register_start = """app.post('/api/auth/register', async (req, res) => {
  const { name, email, username, password, region } = req.body || {};
  if (!name || !email || !username || !password) {"""

new_register_start = """app.post('/api/auth/register', async (req, res) => {
  try {
  const { name, email, username, password, region } = req.body || {};
  if (!name || !email || !username || !password) {"""

server = server.replace(old_register_start, new_register_start)

# Find the end of the register route and add catch
old_register_end = """  const { password: _pw, ...safeUser } = newUser;
  console.log(`[register] New user: ${username} (${email}) from ${region}`);
  res.status(201).json({ token, user: safeUser });
});"""

new_register_end = """  const { password: _pw, ...safeUser } = newUser;
  console.log(`[register] New user: ${username} (${email}) from ${region}`);
  res.status(201).json({ token, user: safeUser });
  } catch (topErr) {
    console.error('[register] Top-level error:', topErr.message, topErr.stack);
    res.status(500).json({ error: 'Registration failed: ' + topErr.message });
  }
});"""

server = server.replace(old_register_end, new_register_end)

with codecs.open("server.js", "w", encoding="utf-8") as f:
    f.write(server)

print("Registration wrapped in top-level try-catch")
