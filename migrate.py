import sys

with open("server.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. CORS
code = code.replace("'https://norbertmuzila.github.io',", "'https://norbertmuzila.github.io',\n    'https://wafeo.vercel.app',")

# 2. readData
old_read = """const dataPath = (filename) => path.join(__dirname, 'data', filename);

function readData(filename) {
  try {
    return JSON.parse(fs.readFileSync(dataPath(filename), 'utf8'));
  } catch (err) {
    console.error(`[ERROR] reading ${filename}:`, err.message);
    return null;
  }
}"""

new_read = """const dataPath = (filename) => path.join(__dirname, 'data', filename);

// Firebase Firestore connection
let db;
try {
  const firebase = require('./lib/firebase');
  db = firebase.db;
  console.log('[firebase] Firestore connected');
} catch (err) {
  console.warn('[firebase] Firestore not available, falling back to JSON files:', err.message);
  db = null;
}

// Read data from Firestore first, fall back to JSON files
async function readData(filename) {
  const collectionMap = {
    'users.json': { type: 'collection', name: 'users' },
    'stats.json': { type: 'doc', collection: 'config', docId: 'stats' },
    'alerts.json': { type: 'collection', name: 'alerts' },
    'satellites.json': { type: 'collection', name: 'satellites' },
    'ndvi.json': { type: 'collection', name: 'ndvi' },
    'fields.json': { type: 'collection', name: 'fields' },
    'water.json': { type: 'doc', collection: 'config', docId: 'water' },
    'food-security.json': { type: 'doc', collection: 'config', docId: 'food-security' },
    'countries.json': { type: 'collection', name: 'countries' },
  };
  if (db) {
    try {
      const mapping = collectionMap[filename];
      if (mapping) {
        if (mapping.type === 'collection') {
          const snapshot = await db.collection(mapping.name).get();
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
          const doc = await db.collection(mapping.collection).doc(mapping.docId).get();
          return doc.exists ? doc.data() : null;
        }
      }
    } catch (err) {
      console.warn(`[firebase] Error reading ${filename}, falling back to JSON:`, err.message);
    }
  }
  try {
    return JSON.parse(fs.readFileSync(dataPath(filename), 'utf8'));
  } catch (err) {
    console.error(`[ERROR] reading ${filename}:`, err.message);
    return null;
  }
}"""

code = code.replace(old_read, new_read)

# 3. Async Routes
code = code.replace("app.post('/api/auth/login', (req, res) =>", "app.post('/api/auth/login', async (req, res) =>")
code = code.replace("const users = readData('users.json');", "const users = await readData('users.json');")
code = code.replace("const stats = readData('stats.json');", "const stats = await readData('stats.json');")
code = code.replace("const data = readData('alerts.json');", "const data = await readData('alerts.json');")
code = code.replace("const data = readData('satellites.json');", "const data = await readData('satellites.json');")
code = code.replace("const data = readData('ndvi.json');", "const data = await readData('ndvi.json');")
code = code.replace("const data = readData('fields.json');", "const data = await readData('fields.json');")
code = code.replace("const data = readData('water.json');", "const data = await readData('water.json');")
code = code.replace("const data = readData('food-security.json');", "const data = await readData('food-security.json');")

code = code.replace("app.get('/api/dashboard/stats', auth, (req, res) =>", "app.get('/api/dashboard/stats', auth, async (req, res) =>")
code = code.replace("app.get('/api/alerts', auth, (req, res) =>", "app.get('/api/alerts', auth, async (req, res) =>")
code = code.replace("app.get('/api/satellites', auth, (req, res) =>", "app.get('/api/satellites', auth, async (req, res) =>")
code = code.replace("app.get('/api/analytics/ndvi-by-region', auth, (req, res) =>", "app.get('/api/analytics/ndvi-by-region', auth, async (req, res) =>")
code = code.replace("app.get('/api/fields', auth, (req, res) =>", "app.get('/api/fields', auth, async (req, res) =>")
code = code.replace("app.get('/api/water', auth, (req, res) =>", "app.get('/api/water', auth, async (req, res) =>")
code = code.replace("app.get('/api/food-security', auth, (req, res) =>", "app.get('/api/food-security', auth, async (req, res) =>")

# 4. Export & Conditional Listen
old_listen = """app.listen(PORT, () => {
  console.log(`\\n  ????????????????????????????????????????????`);
  console.log(`  ? WAFEO Digital Twin API  v2.0.0        ?`);
  console.log(`  ? Running on http://localhost:${PORT}         ?`);
  console.log(`  ????????????????????????????????????????????\\n`);
});"""

new_listen = """if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\\n  ????????????????????????????????????????????`);
    console.log(`  ? WAFEO Digital Twin API  v2.0.0        ?`);
    console.log(`  ? Running on http://localhost:${PORT}         ?`);
    console.log(`  ????????????????????????????????????????????\\n`);
  });
}

module.exports = app;"""

code = code.replace(old_listen, new_listen)

with open("server.js", "w", encoding="utf-8") as f:
    f.write(code)

print("server.js updated successfully")
