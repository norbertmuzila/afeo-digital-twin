require("dotenv").config();
const { db } = require("./lib/firebase");

async function testWrite() {
  try {
    const newUser = {
      id: 999,
      username: "testwrite",
      email: "testwrite@test.com",
      name: "Test Write",
      password: "dummy",
      role: "researcher",
      region: "Global",
      registeredAt: new Date().toISOString()
    };
    
    console.log("Attempting to write to Firestore...");
    await db.collection("users").doc(String(newUser.id)).set(newUser);
    console.log("Write successful!");
  } catch (err) {
    console.error("Write failed:", err);
  } finally {
    process.exit(0);
  }
}

testWrite();
