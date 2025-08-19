// ========== CONFIG ==========
const API_URL = "https://rupebvabajtqnwpwytjf.supabase.co/rest/v1/secrets";
const VIEWS_URL = "https://rupebvabajtqnwpwytjf.supabase.co/rest/v1/secret_views";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGVidmFiYWp0cW53cHd5dGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NDU1MTAsImV4cCI6MjA2ODAyMTUxMH0.jcPhEvr83w1CJYmyen6k354U2riN3-76WcOmppFsbvg";

// ========== CLIENT_ID ==========
const clientId = crypto.randomUUID(); // anonim random id

// ========== DOM ==========
const sendBtn = document.getElementById("sendBtn");
const fetchBtn = document.getElementById("fetchBtn");
const sendMsg = document.getElementById("sendMsg");

// ========== HELPERS ==========
function lock(btn, state = true) {
  if (!btn) return;
  btn.disabled = state;
  btn.classList.toggle("opacity-50", state);
  btn.classList.toggle("cursor-not-allowed", state);
}

// basit toast mesajı (alert yerine daha şık)
function toast(msg, type = "info") {
  const div = document.createElement("div");
  div.textContent = msg;
  div.className =
    "fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg text-sm text-white " +
    (type === "error"
      ? "bg-red-600"
      : type === "success"
      ? "bg-green-600"
      : "bg-gray-700");
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// ========== SUBMIT ==========
sendBtn.addEventListener("click", async () => {
  const input = document.getElementById("secretInput");
  const content = input.value.trim();

  if (content.length < 30) {
    toast("Please enter at least 30 characters.", "error");
    return;
  }
  if (/^(.)\1{10,}$/.test(content) || /^[^a-zA-Z0-9]+$/.test(content)) {
    toast("This doesn't look like a real secret.", "error");
    return;
  }

  lock(sendBtn, true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ content, client_id: clientId })
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Submit failed: ${t}`);
    }

    input.value = "";
    sendMsg.classList.remove("hidden");
    localStorage.setItem("hasSentSecret", "true");

    // sır çekme butonunu aktif et
    if (!localStorage.getItem("hasFetchedSecret")) {
      fetchBtn.disabled = false;
      fetchBtn.classList.remove("opacity-50", "cursor-not-allowed", "bg-gray-600");
      fetchBtn.classList.add("bg-purple-600", "hover:bg-purple-700");
    }

    toast("✅ Secret submitted!", "success");
  } catch (e) {
    toast("Error submitting secret: " + e.message, "error");
  } finally {
    lock(sendBtn, false);
  }
});

// ========== FETCH (sadece 1 kez) ==========
fetchBtn.addEventListener("click", async () => {
  lock(fetchBtn, true);

  try {
    // daha önce görülen sırlar
    const seenRes = await fetch(`${VIEWS_URL}?select=secret_id&client_id=eq.${clientId}`, {
      headers: { "apikey": API_KEY, "Authorization": `Bearer ${API_KEY}` }
    });
    const seen = await seenRes.json();
    const seenIds = seen.map(r => r.secret_id);

    // sırları çek (kendi sırların hariç)
    const res = await fetch(
      `${API_URL}?select=id,content&client_id=neq.${clientId}&order=created_at.desc&limit=50`,
      { headers: { "apikey": API_KEY, "Authorization": `Bearer ${API_KEY}` } }
    );

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Fetch failed: ${t}`);
    }

    const data = await res.json();
    const unseen = data.filter(item => !seenIds.includes(item.id));

    if (unseen.length > 0) {
      const random = unseen[Math.floor(Math.random() * unseen.length)];

      // sır içeriğini toast yerine modal/alert gösterebilirsin
      toast("💬 " + random.content, "info");

      // görüldü olarak kaydet
      await fetch(VIEWS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": API_KEY,
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ secret_id: random.id, client_id: clientId })
      });

      // butonu kapat → sadece 1 kez sır alabilir
      fetchBtn.disabled = true;
      fetchBtn.classList.add("opacity-50", "cursor-not-allowed", "bg-gray-600");
      fetchBtn.classList.remove("bg-purple-600", "hover:bg-purple-700");
      localStorage.setItem("hasFetchedSecret", "true");
    } else {
      toast("No new secrets found.", "error");
    }
  } catch (e) {
    toast("Error fetching secret: " + e.message, "error");
  } finally {
    lock(fetchBtn, false);
  }
});

// ========== INITIALIZE ==========
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("hasSentSecret") === "true") {
    if (localStorage.getItem("hasFetchedSecret") === "true") {
      // sır zaten alındı → buton kapalı
      fetchBtn.disabled = true;
      fetchBtn.classList.add("opacity-50", "cursor-not-allowed", "bg-gray-600");
      fetchBtn.classList.remove("bg-purple-600", "hover:bg-purple-700");
    } else {
      // sır alabilir
      fetchBtn.disabled = false;
      fetchBtn.classList.remove("opacity-50", "cursor-not-allowed", "bg-gray-600");
      fetchBtn.classList.add("bg-purple-600", "hover:bg-purple-700");
    }
  }
});
