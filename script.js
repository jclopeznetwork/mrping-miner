// script.js

// Simple API helper
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Detect user (Telegram or fallback guest)
function detectUser() {
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      if (tgUser) {
        return {
          id: tgUser.id,
          username: tgUser.username || tgUser.first_name || "tg-user",
          source: "telegram",
        };
      }
    }
  } catch (e) {
    console.warn("Telegram WebApp detection failed:", e);
  }

  // Fallback: guest ID stored in localStorage
  let guestId = localStorage.getItem("simple-miner-guest-id");
  if (!guestId) {
    guestId = "guest-" + Math.floor(Math.random() * 1e9);
    localStorage.setItem("simple-miner-guest-id", guestId);
  }

  return {
    id: guestId,
    username: "guest",
    source: "guest",
  };
}

const user = detectUser();

async function loadState() {
  try {
    const data = await apiPost("/api/state", {
      userId: user.id,
      username: user.username,
    });

    const coinCountElement = document.getElementById("coinCount");
    coinCountElement.textContent = data.coins;

    const label = document.getElementById("userLabel");
    label.textContent =
      `User: ${data.username || "guest"} · ID: ${data.id} · Total mined: ${data.totalMined}`;
  } catch (e) {
    console.error("Failed to load state:", e);
    document.getElementById("userLabel").textContent =
      "Error loading state: " + e.message;
  }
}

async function mineCoins() {
  const mineButton = document.getElementById("mineButton");
  mineButton.disabled = true;

  try {
    const data = await apiPost("/api/mine", {
      userId: user.id,
      username: user.username,
    });

    const coinCountElement = document.getElementById("coinCount");
    coinCountElement.textContent = data.coins;

    const label = document.getElementById("userLabel");
    label.textContent =
      `User: ${user.username} · ID: ${user.id} · Total mined: ${data.totalMined}`;
  } catch (e) {
    alert("Mining failed: " + e.message);
  } finally {
    mineButton.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const mineButton = document.getElementById("mineButton");
  mineButton.addEventListener("click", mineCoins);

  // Initial load
  loadState();
});
