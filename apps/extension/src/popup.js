const API_BASE = "http://localhost:4100";

const companyEl = document.getElementById("company");
const roleEl = document.getElementById("role");
const channelEl = document.getElementById("channel");
const sourceUrlEl = document.getElementById("sourceUrl");
const saveBtn = document.getElementById("save-btn");
const clearBtn = document.getElementById("clear-btn");
const statusEl = document.getElementById("save-status");
const authNeeded = document.getElementById("auth-needed");
const authOk = document.getElementById("auth-ok");
const userLabel = document.getElementById("user-label");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authStatus = document.getElementById("auth-status");

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = "status " + (type === "error" ? "status-error" : "status-success");
  statusEl.style.display = "block";
}

function checkAuth() {
  chrome.storage.local.get(["jv_token", "jv_user"], (result) => {
    if (result.jv_token && result.jv_user) {
      authNeeded.style.display = "none";
      authOk.style.display = "flex";
      userLabel.textContent = result.jv_user.name || result.jv_user.email;
      saveBtn.disabled = false;
    } else {
      authNeeded.style.display = "block";
      authOk.style.display = "none";
      saveBtn.disabled = true;
    }
  });
}

loginBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) return;

  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    chrome.storage.local.set({ jv_token: data.token, jv_user: data.user }, () => {
      checkAuth();
    });
  } catch (err) {
    authStatus.textContent = err.message;
    authStatus.className = "status status-error";
    authStatus.style.display = "block";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in";
  }
});

logoutBtn.addEventListener("click", () => {
  chrome.storage.local.remove(["jv_token", "jv_user"], () => {
    checkAuth();
  });
});

chrome.storage.local.get(["latestCapture"], (result) => {
  const capture = result.latestCapture ?? {};
  companyEl.value = capture.company || "";
  roleEl.value = capture.title || "";
  sourceUrlEl.value = capture.sourceUrl || "";
  if (capture.channel) channelEl.value = capture.channel;
});

saveBtn.addEventListener("click", async () => {
  const company = companyEl.value.trim();
  const role = roleEl.value.trim();
  if (!company || !role) {
    showStatus("Company and role are required", "error");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  chrome.storage.local.get(["jv_token"], async (result) => {
    try {
      const res = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${result.jv_token}`,
        },
        body: JSON.stringify({
          company,
          role,
          channel: channelEl.value,
          appliedAt: new Date().toISOString().slice(0, 10),
          sourceUrl: sourceUrlEl.value || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");

      showStatus(`Saved "${company} — ${role}" to JobVault!`, "success");
      saveBtn.textContent = "Saved!";

      chrome.storage.local.get(["captureQueue"], (qResult) => {
        const queue = qResult.captureQueue ?? [];
        queue.push({ company, role, channel: channelEl.value, savedAt: new Date().toISOString() });
        chrome.storage.local.set({ captureQueue: queue });
      });
    } catch (err) {
      showStatus(err.message, "error");
      saveBtn.disabled = false;
      saveBtn.textContent = "Save to JobVault";
    }
  });
});

clearBtn.addEventListener("click", () => {
  companyEl.value = "";
  roleEl.value = "";
  sourceUrlEl.value = "";
  channelEl.selectedIndex = 0;
  statusEl.style.display = "none";
  saveBtn.disabled = false;
  saveBtn.textContent = "Save to JobVault";
});

checkAuth();
