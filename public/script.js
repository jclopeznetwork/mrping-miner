// script.js – front-end logic for Mr.Ping Miner

const coinCountElement = document.getElementById("coinCount");
const mineButton = document.getElementById("mineButton");
const dailyInfo = document.getElementById("dailyInfo");
const userNameLabel = document.getElementById("userName");
const statusLabel = document.getElementById("status");

let currentUser = {
  id: null,
  username: "guest",
};

function detectTelegramUser() {
  try {
    if (
      window.Telegram &&
      window.Telegram.WebApp &&
      window.Telegram.WebApp.initDataUnsafe
    ) {
      const u = window.Telegram.WebApp.initDataUnsafe.user;
      if (u) {
        return {
          id: u.id,
          username: u.username || u.first_name || "tg-user",
        };
      }
    }
  } catch (e) {
    console.warn("Telegram detection failed", e);
  }

  // Fallback: browser guest
  let stored = localStorage.getItem("mrping-guest-id");
  if (!stored) {
    stored = "guest-" + Math.floor(Math.random() * 1e9);
    localStorage.setItem("mrping-guest-id", stored);
  }
  return { id: stored, username: "guest" };
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = await res.text().catch(() => res.statusText);
    throw new Error(msg);
  }
  return res.json();
}

async function loadUser() {
  try {
    const data = await apiPost("/api/user", {
      userId: currentUser.id,
      username: currentUser.username,
    });

    coinCountElement.textContent = data.balance.toFixed(3);
    dailyInfo.textContent =
      "Today: " +
      data.miningClicksToday +
      " / " +
      data.maxMiningPerDay +
      " taps";

    userNameLabel.textContent = "User: " + (data.username || "guest");
    statusLabel.textContent = "";
  } catch (e) {
    console.error(e);
    statusLabel.textContent = "Failed to load data.";
  }
}

async function mine() {
  mineButton.disabled = true;
  statusLabel.textContent = "Mining…";

  try {
    const data = await apiPost("/api/mine", {
      userId: currentUser.id,
      username: currentUser.username,
    });

    coinCountElement.textContent = data.balance.toFixed(3);
    dailyInfo.textContent =
      "Today: " +
      data.miningClicksToday +
      " / " +
      data.maxMiningPerDay +
      " taps";
    statusLabel.textContent = "✅ " + data.message;
  } catch (e) {
    console.error(e);
    if (e.message.includes("limit")) {
      statusLabel.textContent = "⛔ Daily limit reached.";
    } else {
      statusLabel.textContent = "❌ " + e.message;
    }
  } finally {
    mineButton.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  currentUser = detectTelegramUser();

  userNameLabel.textContent = "User: " + currentUser.username;
  statusLabel.textContent = "Loading balance…";

  mineButton.addEventListener("click", mine);

  loadUser();
});
