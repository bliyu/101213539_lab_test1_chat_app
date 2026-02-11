const msg = document.getElementById("msg");
document.getElementById("signupBtn").addEventListener("click", async () => {
  msg.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    msg.textContent = (data.message || "Signup failed") + (data.error ? ` (${data.error})` : "");
    return;
  }

  msg.textContent = "Signup successful. Redirecting to login...";
  setTimeout(() => (window.location.href = "/view/login.html"), 700);
});
