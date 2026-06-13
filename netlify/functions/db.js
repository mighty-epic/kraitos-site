const fs = require("fs");
const path = require("path");
const os = require("os");

let blobsStore = null;
let blobsStoreInitialized = false;

function getBlobsStore() {
  if (blobsStoreInitialized) {
    return blobsStore;
  }
  blobsStoreInitialized = true;
  try {
    const { getStore } = require("@netlify/blobs");
    blobsStore = getStore("waitlist");
  } catch (e) {
    if (e.name === "MissingBlobsEnvironmentError" && process.env.SITE_ID && process.env.NETLIFY_FUNCTIONS_TOKEN) {
      try {
        const { getStore } = require("@netlify/blobs");
        blobsStore = getStore({
          name: "waitlist",
          siteID: process.env.SITE_ID,
          token: process.env.NETLIFY_FUNCTIONS_TOKEN
        });
        console.log("Netlify Blobs initialized manually with SITE_ID and NETLIFY_FUNCTIONS_TOKEN");
      } catch (manualErr) {
        console.error("Netlify Blobs failed manual initialization:", manualErr);
      }
    } else {
      console.error("Netlify Blobs failed to initialize in request context:", e);
    }
  }
  return blobsStore;
}

const tempDbPath = path.join(os.tmpdir(), "kraitos_waitlist_db.json");

async function readDb() {
  const store = getBlobsStore();
  if (store) {
    try {
      const data = await store.get("all_users", { type: "json" });
      return data || {};
    } catch (err) {
      console.error("Error reading from Netlify Blobs:", err);
      return {};
    }
  } else {
    if (fs.existsSync(tempDbPath)) {
      try {
        return JSON.parse(fs.readFileSync(tempDbPath, "utf8"));
      } catch (e) {
        return {};
      }
    }
    return {};
  }
}

async function writeDb(data) {
  const store = getBlobsStore();
  if (store) {
    try {
      await store.setJSON("all_users", data);
    } catch (err) {
      console.error("Error writing to Netlify Blobs:", err);
    }
  } else {
    try {
      fs.writeFileSync(tempDbPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Error writing to local JSON DB:", e);
    }
  }
}

module.exports = {
  getUser: async (email) => {
    const db = await readDb();
    return db[email] || null;
  },
  setUser: async (email, userData) => {
    const db = await readDb();
    db[email] = { ...db[email], ...userData, email };
    await writeDb(db);
  },
  listUsers: async () => {
    const db = await readDb();
    return Object.values(db);
  }
};
