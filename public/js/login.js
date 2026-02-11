const msg = document.getElementById("msg");

document.getElementById("loginBtn").addEventListener("click", async () => {
  msg.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    msg.textContent = (data.message || "Login failed") + (data.error ? ` (${data.error})` : "");
    return;
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("username", data.username);
  window.location.href = "/view/chat.html";
});
