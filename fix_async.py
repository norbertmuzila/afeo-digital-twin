import sys

with open("server.js", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("app.post('/api/auth/register', (req, res) => {", "app.post('/api/auth/register', async (req, res) => {")
code = code.replace("app.get('/api/admin/users', auth, (req, res) => {", "app.get('/api/admin/users', auth, async (req, res) => {")

with open("server.js", "w", encoding="utf-8") as f:
    f.write(code)

print("server.js async/await fixed")
