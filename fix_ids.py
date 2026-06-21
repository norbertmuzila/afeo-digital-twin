import codecs

with codecs.open("server.js", "r", encoding="utf-8") as f:
    server = f.read()

# Fix ID generation in registration to use timestamp-based unique IDs
server = server.replace(
    """  const newUser = {
    id: users.length + 1,
    username,
    email,
    name,
    password: hashPassword(password),
    role: 'researcher',
    region: region || 'Global',
    registeredAt: new Date().toISOString()
  };""",
    """  const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
  const newUser = {
    id: maxId + 1,
    username,
    email,
    name,
    password: hashPassword(password),
    role: 'researcher',
    region: region || 'Global',
    registeredAt: new Date().toISOString()
  };"""
)

# Fix ID generation in Google auth too
server = server.replace(
    """      const newUser = {
        id: users.length + 1,
        username: payload.email.split('@')[0],""",
    """      const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
      const newUser = {
        id: maxId + 1,
        username: payload.email.split('@')[0],"""
)

with codecs.open("server.js", "w", encoding="utf-8") as f:
    f.write(server)

print("Fixed ID generation to use max-based unique IDs")
