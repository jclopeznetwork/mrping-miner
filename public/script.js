async function mine() {
    const res = await fetch("/api/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 1 })
    });

    const data = await res.json();
    alert("Mined! Balance: " + data.newBalance);
}
