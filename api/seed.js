const { db } = require('../lib/firebase');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Simple protection: only allow seeding if a specific query param is passed
  if (req.query.secret !== 'wafeo-admin-seed-2024') {
    return res.status(403).json({ error: 'Unauthorized. Invalid secret.' });
  }

  const dataDir = path.join(__dirname, '..', 'data');

  const arrayCollections = [
    { file: 'users.json', collection: 'users' },
    { file: 'alerts.json', collection: 'alerts' },
    { file: 'satellites.json', collection: 'satellites' },
    { file: 'ndvi.json', collection: 'ndvi' },
    { file: 'fields.json', collection: 'fields' },
    { file: 'countries.json', collection: 'countries' },
  ];

  const singleDocCollections = [
    { file: 'stats.json', collection: 'config', docId: 'stats' },
    { file: 'water.json', collection: 'config', docId: 'water' },
    { file: 'food-security.json', collection: 'config', docId: 'food-security' },
  ];

  const results = [];

  try {
    for (const { file, collection } of arrayCollections) {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      const batch = db.batch();
      const arr = Array.isArray(data) ? data : [data];
      
      arr.forEach((doc, i) => {
        const id = doc.id ? String(doc.id) : String(i);
        batch.set(db.collection(collection).doc(id), doc);
      });
      await batch.commit();
      results.push(`OK: ${collection} seeded with ${arr.length} docs`);
    }

    for (const { file, collection, docId } of singleDocCollections) {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      await db.collection(collection).doc(docId).set(data);
      results.push(`OK: ${collection}/${docId} seeded`);
    }

    res.status(200).json({ success: true, message: 'Database seeded successfully!', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, results });
  }
};
