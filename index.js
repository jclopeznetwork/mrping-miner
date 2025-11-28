const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ------------------------------
// Load DB
// ------------------------------
const DB_FILE = path.join(__dirname, "db.json");

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ------------------------------
// API ROUTES
// ------------------------------
app.post("/api/user", (req, res) => {
  const { userId, username } = req.body;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const db = readDB();

  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      username: username || "guest",
      balance: 0,
      miningClicksToday: 0,
      lastMiningDate: null,
    };
    writeDB(db);
  }

  return res.json({
    ...db.users[userId],
    settings: db.settings,
  });
});

app.post("/api/mine", (req, res) => {
  const { userId } = req.body;

  const db = readDB();
  const user = db.users[userId];

  if (!user) return res.status(400).json({ error: "User not found" });

  const today = new Date().toISOString().slice(0, 10);

  if (user.lastMiningDate !== today) {
    user.lastMiningDate = today;
    user.miningClicksToday = 0;
  }

  if (user.miningClicksToday >= db.settings.MAX_MINING_PER_DAY) {
    return res.json({ error: "Daily limit reached" });
  }

  user.balance += db.settings.MINING_REWARD;
  user.miningClicksToday++;

  writeDB(db);

  return res.json({ success: true, balance: user.balance });
});

// Leaderboard
app.get("/api/leaderboard", (req, res) => {
  const db = readDB();

  const top = Object.values(db.users)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 20);

  res.json({ top });
});

// ------------------------------
// START SERVER
// ------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log("MrPing backend running on port", PORT)
);
