document.addEventListener("DOMContentLoaded", async () => {
    const tg = window.Telegram.WebApp;
    tg.expand();

    async function loadUser() {
        const res = await fetch("/api/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initDataUnsafe })
        });
        const data = await res.json();
        console.log("User Data:", data);

        if (data.ok) {
            document.getElementById("balance").innerText = data.balance;
        }
    }

    document.getElementById("mine").addEventListener("click", async () => {
        const res = await fetch("/api/mine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initDataUnsafe })
        });
        const data = await res.json();
        alert("Mined! Balance: " + data.balance);
    });

    loadUser();
});
