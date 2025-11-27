// index.js – Mr.Ping Miner (simple backend + mini-app)

// ============= CONFIG & IMPORTS =============
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { Telegraf, Markup } = require("telegraf");

// --- ENV ---
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing in .env");
  process.exit(1);
}

// If not set, Render will inject RENDER_EXTERNAL_URL in production
const WEBAPP_URL =
  process.env.WEBAPP_URL ||
  process.env.RENDER_EXTERNAL_URL || // e.g. https://mrping-miner.onrender.com
  "http://localhost:3000";

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");

// Mining config
const MINING_REWARD_PER_CLICK = Number(process.env.MINING_REWARD_PER_CLICK || 1); // 1 Mr.Ping per tap
const MAX_MINING_CLICKS_PER_DAY = Number(
  process.env.MAX_MINING_CLICKS_PER_DAY || 500
);

// ============= SIMPLE FILE DATABASE =============
function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading DB:", e);
  }
  return {
    users: {}, // id -> { id, username, balance, totalMined, miningClicksToday, lastMiningDay }
  };
}

let db = loadDb();

function saveDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing DB:", e);
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getUserById(id, username = "") {
  const key = String(id);
  if (!db.users[key]) {
    db.users[key] = {
      id: key,
      username,
      balance: 0,
      totalMined: 0,
      miningClicksToday: 0,
      lastMiningDay: todayKey(),
    };
  }
  const user = db.users[key];
  const today = todayKey();
  if (user.lastMiningDay !== today) {
    user.lastMiningDay = today;
    user.miningClicksToday = 0;
  }
  if (username && !user.username) {
    user.username = username;
  }
  return user;
}

// ============= TELEGRAM BOT =============
const bot = new Telegraf(BOT_TOKEN);

// /start with mini-app button
bot.start((ctx) => {
  const tgUser = ctx.from;
  getUserById(tgUser.id, tgUser.username || tgUser.first_name || "");

  ctx.reply(
    "🐧 *Welcome to Mr.Ping Miner!*\n\n" +
      "Tap the button to open the mini-app and start mining Mr.Ping.\n\n" +
      `👉 1 tap = *${MINING_REWARD_PER_CLICK}* Mr.Ping\n` +
      `👉 Daily cap = *${MAX_MINING_CLICKS_PER_DAY}* taps`,
    {
      parse_mode: "Markdown",
      ...Markup.keyboard([
        [
          {
            text: "🚀 Open Mr.Ping Miner",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ]).resize(),
    }
  );
});

bot.help((ctx) => {
  ctx.reply(
    "ℹ️ *How it works*\n\n" +
      "1. Press “🚀 Open Mr.Ping Miner” to open the web mini-app\n" +
      "2. Tap the big button to mine Mr.Ping\n" +
      "3. Your balance is stored on the server (not just your phone)",
    { parse_mode: "Markdown" }
  );
});

// ============= EXPRESS APP (API + STATIC) =============
const app = express();
app.use(cors());
app.use(express.json());

// Static front-end
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Explicit root route so Render hits index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Helper: extract user from request.body
function getUserFromBody(req, res) {
  const { userId, username } = req.body;
  if (!userId) {
    res.status(400).json({ error: "userId missing" });
    return null;
  }
  return getUserById(userId, username || "");
}

// --- API: Get current user info ---
app.post("/api/user", (req, res) => {
  const user = getUserFromBody(req, res);
  if (!user) return;

  res.json({
    id: user.id,
    username: user.username,
    balance: user.balance,
    totalMined: user.totalMined,
    miningClicksToday: user.miningClicksToday,
    maxMiningPerDay: MAX_MINING_CLICKS_PER_DAY,
    miningReward: MINING_REWARD_PER_CLICK,
  });
});

// --- API: Mine one tap ---
app.post("/api/mine", (req, res) => {
  const user = getUserFromBody(req, res);
  if (!user) return;

  if (user.miningClicksToday >= MAX_MINING_CLICKS_PER_DAY) {
    return res.status(400).json({
      error: "limit",
      message: `Daily limit reached (${MAX_MINING_CLICKS_PER_DAY} taps).`,
    });
  }

  user.miningClicksToday += 1;
  user.balance += MINING_REWARD_PER_CLICK;
  user.totalMined += MINING_REWARD_PER_CLICK;
  saveDb();

  res.json({
    ok: true,
    message: "Mined successfully.",
    balance: user.balance,
    totalMined: user.totalMined,
    miningClicksToday: user.miningClicksToday,
    maxMiningPerDay: MAX_MINING_CLICKS_PER_DAY,
  });
});

// ============= WEBHOOK VS POLLING =============
const PORT = process.env.PORT || 3000;
const useWebhook = !!process.env.RENDER_EXTERNAL_URL;

if (useWebhook) {
  const baseUrl = process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, "");
  const webhookPath = `/bot${BOT_TOKEN}`;
  const webhookUrl = `${baseUrl}${webhookPath}`;

  app.use(webhookPath, bot.webhookCallback(webhookPath));

  bot.telegram
    .setWebhook(webhookUrl)
    .then(() => {
      console.log("🌐 Running at", baseUrl);
      console.log("📡 Telegram webhook set to", webhookUrl);
    })
    .catch((err) => {
      console.error("Failed to set webhook:", err);
    });
} else {
  // Local dev: use long polling
  bot.launch().then(() => {
    console.log("🤖 Bot launched in long-polling mode (local dev).");
  });
}

// Start HTTP server (Render needs this)
app.listen(PORT, () => {
  console.log(`🚀 Web server listening on http://localhost:${PORT}`);
  console.log("Static front-end from:", publicDir);
});

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
