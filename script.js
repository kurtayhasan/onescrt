// ========== CONFIG ==========
const API_URL = "https://rupebvabajtqnwpwytjf.supabase.co/rest/v1/secrets";
const VIEWS_URL = "https://rupebvabajtqnwpwytjf.supabase.co/rest/v1/secret_views";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGVidmFiYWp0cW53cHd5dGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NDU1MTAsImV4cCI6MjA2ODAyMTUxMH0.jcPhEvr83w1CJYmyen6k354U2riN3-76WcOmppFsbvg";

// ========== CLIENT_ID ==========
const clientId = crypto.randomUUID(); // sadece anonim random kimlik

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

// ========== SUBMIT ==========
sendBtn.addEventListener("click", async () => {
  const input = document.getElementById("secretInput");
  const content = input.value.trim();

  // basit validasyon
  if (content.length < 30) {
    alert("Please enter at least 30 characters.");
    return;
  }
  if (/^(.)\1{10,}$/.test(content) || /^[^a-zA-Z0-9]+$/.test(content)) {
    alert("This doesn't look like a real secret.");
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

    fetchBtn.disabled = false;
    fetchBtn.classList.remove("opacity-50", "cursor-not-allowed", "bg-gray-600");
    fetchBtn.classList.add("bg-purple-600", "hover:bg-purple-700");
  } catch (e) {
    alert("Error submitting secret: " + e.message);
  } finally {
    lock(sendBtn, false);
  }
});

// ========== FETCH ==========
fetchBtn.addEventListener("click", async () => {
  lock(fetchBtn, true);

  try {
    // 1) Daha önce gördüğün sırların id’lerini çek
    const seenRes = await fetch(`${VIEWS_URL}?select=secret_id&client_id=eq.${clientId}`, {
      headers: { "apikey": API_KEY, "Authorization": `Bearer ${API_KEY}` }
    });
    const seen = await seenRes.json();
    const seenIds = seen.map(r => r.secret_id);

    // 2) Yeni sırları çek (kendi sırlarını hariç)
    const res = await fetch(
      `${API_URL}?select=id,content&client_id=neq.${clientId}&order=created_at.desc&limit=50`,
      {
        headers: {
          "apikey": API_KEY,
          "Authorization": `Bearer ${API_KEY}`
        }
      }
    );

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Fetch failed: ${t}`);
    }

    const data = await res.json();

    // 3) Daha önce görülmeyen sırları filtrele
    const unseen = data.filter(item => !seenIds.includes(item.id));
    const random = unseen[Math.floor(Math.random() * unseen.length)];

    if (random) {
      alert(random.content);

      // 4) Bu sır artık görüldü → secret_views’a kaydet
      await fetch(VIEWS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": API_KEY,
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ secret_id: random.id, client_id: clientId })
      });
    } else {
      alert("No new secrets found.");
    }
  } catch (e) {
    alert("Error fetching secret: " + e.message);
  } finally {
    lock(fetchBtn, false);
  }
});

// ========== INITIALIZE ==========
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("hasSentSecret") === "true") {
    fetchBtn.disabled = false;
    fetchBtn.classList.remove("opacity-50", "cursor-not-allowed", "bg-gray-600");
    fetchBtn.classList.add("bg-purple-600", "hover:bg-purple-700");
  }
});
