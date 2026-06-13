const fs = require("fs");
const path = require("path");
const os = require("os");

let blobsStore = null;
try {
  const { getStore } = require("@netlify/blobs");
  // Check if running in a Netlify serverless environment
  if (process.env.NETLIFY || process.env.NETLIFY_DEV || process.env.NETLIFY_IMAGES_CDN_DOMAIN) {
    blobsStore = getStore("waitlist");
  }
} catch (e) {
  // Silent catch, will fallback to local file
}

const tempDbPath = path.join(os.tmpdir(), "kraitos_waitlist_db.json");

async function readDb() {
  if (blobsStore) {
    try {
      const data = await blobsStore.get("all_users", { type: "json" });
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
  if (blobsStore) {
    try {
      await blobsStore.setJSON("all_users", data);
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
