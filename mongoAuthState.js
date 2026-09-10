const { initAuthCreds, BufferJSON, proto } = require("@whiskeysockets/baileys");
const { getDb } = require("./mongo");

const COLLECTION = "auth_sessions";

async function getCollection() {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ sessionId: 1 }).catch(() => {});
  return collection;
}

// Toleo la useMultiFileAuthState la Baileys, tofauti pekee ni kwamba
// creds/keys zinahifadhiwa MongoDB (document moja kwa kila "key") badala
// ya faili kwenye disk - hii ndiyo inayowezesha session kubaki hai hata
// bot ikianzishwa upya kwenye server isiyo na disk ya kudumu.
async function useMongoAuthState(sessionId) {
  const collection = await getCollection();

  const docId = (key) => `${sessionId}:${key}`;

  const writeData = async (key, data) => {
    const value = JSON.stringify(data, BufferJSON.replacer);
    await collection.updateOne(
      { _id: docId(key) },
      { $set: { sessionId, value, updatedAt: new Date() } },
      { upsert: true }
    );
  };

  const readData = async (key) => {
    try {
      const doc = await collection.findOne({ _id: docId(key) });
      if (!doc?.value) return null;
      return JSON.parse(doc.value, BufferJSON.reviver);
    } catch (_) {
      return null;
    }
  };

  const removeData = async (key) => {
    await collection.deleteOne({ _id: docId(key) });
  };

  const creds = (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData("creds", creds),
    // Futa session yote ya namba hii kwenye MongoDB (inatumika logout)
    clearSession: async () => {
      await collection.deleteMany({ sessionId });
    },
  };
}

// Angalia namba zenye session iliyosajiliwa kikamilifu (creds.registered === true)
// ili zirudishwe (resume) wakati bot inapoanza.
async function listRegisteredSessionIds() {
  const collection = await getCollection();
  const credDocs = await collection.find({ _id: { $regex: /:creds$/ } }).toArray();

  return credDocs
    .filter((doc) => {
      try {
        const parsed = JSON.parse(doc.value, BufferJSON.reviver);
        return !!parsed?.registered;
      } catch (_) {
        return false;
      }
    })
    .map((doc) => doc.sessionId);
}

module.exports = { useMongoAuthState, listRegisteredSessionIds };
