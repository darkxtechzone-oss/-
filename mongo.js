const { MongoClient } = require("mongodb");
const config = require("./config");

let clientPromise = null;

// Muunganiko mmoja wa MongoDB unaotumika kote kwenye app (session storage,
// admin panel, n.k.) - haujaunganishwa mpaka mara ya kwanza inapohitajika.
function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(config.MONGODB_URI);
    clientPromise = client.connect().then((c) => {
      console.log("🍃 Imeunganishwa na MongoDB");
      return c;
    }).catch((err) => {
      clientPromise = null; // ruhusu jaribio jingine baadaye kama muunganiko umeshindwa
      console.error("❌ Imeshindwa kuunganisha na MongoDB:", err.message);
      throw err;
    });
  }
  return clientPromise;
}

async function getDb() {
  const client = await getClient();
  return client.db(config.MONGODB_DB_NAME);
}

module.exports = { getClient, getDb };
