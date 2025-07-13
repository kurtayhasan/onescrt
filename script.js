const API_URL = "https://rupebvabajtqnwpwytjf.supabase.co/rest/v1/secrets";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGVidmFiYWp0cW53cHd5dGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NDU1MTAsImV4cCI6MjA2ODAyMTUxMH0.jcPhEvr83w1CJYmyen6k354U2riN3-76WcOmppFsbvg";

const sendBtn = document.getElementById("sendBtn");
const fetchBtn = document.getElementById("fetchBtn");
const sendMsg = document.getElementById("sendMsg");
const receivedText = document.getElementById("receivedSecret");

sendBtn.addEventListener("click", async () => {
  const input = document.getElementById("secretInput");
  const content = input.value.trim();

  if (content.length < 30) {
    alert("Please enter at least 30 characters.");
    return;
  }

  if (/^(.)\1{10,}$/.test(content) || /^[^a-zA-Z0-9]+$/.test(content)) {
    alert("This doesn't look like a real secret.");
    return;
  }

  await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": API_KEY,
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ content })
  });

  input.value = "";
  sendMsg.classList.remove("hidden");
  localStorage.setItem("hasSentSecret", "true");

  fetchBtn.disabled = false;
  fetchBtn.classList.remove("opacity-50", "cursor-not-allowed", "bg-gray-600");
  fetchBtn.classList.add("bg-purple-600", "hover:bg-purple-700");
});

fetchBtn.addEventListener("click", async () => {
  const res = await fetch(API_URL + "?select=content&order=created_at.desc&limit=50", {
    headers: {
      "apikey": API_KEY,
      "Authorization": `Bearer ${API_KEY}`
    }
  });
  const data = await res.json();
  const random = data[Math.floor(Math.random() * data.length)];
  alert(random?.content || "No secrets found.");
});

window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("hasSentSecret") === "true") {
    fetchBtn.disabled = false;
    fetchBtn.classList.remove("opacity-50", "cursor-not-allowed", "bg-gray-600");
    fetchBtn.classList.add("bg-purple-600", "hover:bg-purple-700");
  }
});
