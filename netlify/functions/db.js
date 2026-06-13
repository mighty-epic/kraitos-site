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
  
  const siteID = process.env.SITE_ID || "51e0c519-c4ad-4060-989a-9e4a876de0bd";
  const token = process.env.NETLIFY_AUTH_TOKEN;

  if (token) {
    try {
      const { getStore } = require("@netlify/blobs");
      blobsStore = getStore("waitlist", {
        siteID: siteID,
        token: token
      });
      console.log("Netlify Blobs initialized manually with custom Token");
      return blobsStore;
    } catch (manualErr) {
      console.error("Netlify Blobs manual initialization failed, trying automatic:", manualErr);
    }
  }

  try {
    const { getStore } = require("@netlify/blobs");
    blobsStore = getStore("waitlist");
    console.log("Netlify Blobs initialized automatically");
  } catch (e) {
    console.error("Netlify Blobs automatic initialization failed:", e);
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
