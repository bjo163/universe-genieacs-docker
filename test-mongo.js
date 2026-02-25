const { MongoClient } = require("mongodb");

const url =
  process.env.GENIEACS_MONGODB_CONNECTION_URL ||
  "mongodb://root:7mE8B1eIhi187sINgrHTJ9D8K2YJeEguyPTmPaza5DJrKDHDc3gkEIIPwzlvMCNC@160.22.193.46:27020/?directConnection=true";

console.log("=== GenieACS MongoDB Connection Test ===\n");
console.log("URL:", url.replace(/:([^@]+)@/, ":****@")); // hide password
console.log("Time:", new Date().toISOString());
console.log("");

async function test() {
  const client = new MongoClient(url, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
  });

  try {
    console.log("[1] Connecting to MongoDB...");
    await client.connect();
    console.log("[1] OK - Connected!\n");

    console.log("[2] Pinging database...");
    const adminDb = client.db("admin");
    const pingResult = await adminDb.command({ ping: 1 });
    console.log("[2] OK - Ping result:", JSON.stringify(pingResult), "\n");

    console.log("[3] Listing databases...");
    const dbs = await adminDb.admin().listDatabases();
    dbs.databases.forEach((db) => {
      console.log(`    - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log("");

    console.log("[4] Checking genieacs database...");
    const genieDb = client.db("genieacs");
    const collections = await genieDb.listCollections().toArray();
    if (collections.length === 0) {
      console.log("[4] genieacs database is empty (no collections yet - this is OK for first run)");
    } else {
      console.log("[4] Collections in genieacs:");
      for (const col of collections) {
        const count = await genieDb.collection(col.name).countDocuments();
        console.log(`    - ${col.name} (${count} documents)`);
      }
    }
    console.log("");

    console.log("=== ALL TESTS PASSED ===");
  } catch (err) {
    console.error("=== TEST FAILED ===");
    console.error("Error:", err.message);
    console.error("");

    if (err.message.includes("ECONNREFUSED")) {
      console.error(">> MongoDB server tidak bisa dijangkau.");
      console.error(">> Cek: MongoDB running? Port benar? Firewall terbuka?");
    } else if (err.message.includes("ETIMEDOUT")) {
      console.error(">> Koneksi timeout - server tidak merespon.");
      console.error(">> Cek: IP benar? Port benar? Firewall/NAT blocking?");
    } else if (err.message.includes("Authentication failed")) {
      console.error(">> Username atau password salah.");
    } else if (err.message.includes("not authorized")) {
      console.error(">> User tidak punya permission untuk operasi ini.");
    }

    process.exit(1);
  } finally {
    await client.close();
  }
}

test();
