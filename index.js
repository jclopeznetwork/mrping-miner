
require("dotenv").config();
const express = require("express");
const path = require("path");
const { Telegraf } = require("telegraf");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------
// ENVIRONMENT CHECK
// -------------------
if (!process.env.BOT_TOKEN) {
    console.log("❌ ERROR: BOT_TOKEN is missing!");
    process.exit(1);
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; 
const bot = new Telegraf(BOT_TOKEN);

// -------------------
// STATIC PUBLIC FOLDER
// -------------------
app.use(express.static(path.join(__dirname, "public")));

// Default route → serve mini-app UI
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

// -------------------
// TELEGRAM WEBHOOK
// -------------------
app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));

bot.telegram.setWebhook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`)
    .then(() => console.log("📡 Telegram Webhook SET"))
    .catch(err => console.error("❌ Failed to set webhook:", err));

// -------------------
// BOT COMMANDS
// -------------------
bot.start((ctx) => {
    ctx.reply("🐧 Welcome to Mr.Ping Miner!\nTap the button below to open the Mini-App.", {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Open Mini-App",
                        web_app: { url: WEBHOOK_URL }
                    }
                ]
            ]
        }
    });
});

// -------------------
app.listen(PORT, () => {
    console.log(`🌐 Running at ${WEBHOOK_URL}`);
});

