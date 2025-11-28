import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const DB_FILE = "./db.json";

// Load DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

// Save DB
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// 🟦 Verify Telegram initData (IMPORTANT)
async function verifyTelegram(initData) {
  if (!initData || !initData.user) return null;
  return initData.user.id.toString();
}

// ==============================
//  API: Get User
// ==============================
app.post("/api/user", async (req, res) => {
  const initData = req.body.initData;
  const tgUserId = await verifyTelegram(initData);

  if (!tgUserId) return res.json({ error: "Invalid Telegram data" });

  let db = loadDB();
  if (!db.users[tgUserId]) {
    db.users[tgUserId] = { balance: 0 };
    saveDB(db);
  }

  res.json({
    ok: true,
    userId: tgUserId,
    balance: db.users[tgUserId].balance
  });
});

// ==============================
//  API: Mine Coins
// ==============================
app.post("/api/mine", async (req, res) => {
  const initData = req.body.initData;
  const tgUserId = await verifyTelegram(initData);

  if (!tgUserId) return res.json({ error: "Invalid Telegram data" });

  let db = loadDB();
  if (!db.users[tgUserId]) {
    db.users[tgUserId] = { balance: 0 };
  }

  db.users[tgUserId].balance += 1;
  saveDB(db);

  res.json({
    ok: true,
    balance: db.users[tgUserId].balance
  });
});

// ==============================
//  FRONTEND
// ==============================
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

