// ========== CONFIG ==========
const SUPABASE_URL = "https://rupebvabajtqnwpwytjf.supabase.co";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGVidmFiYWp0cW53cHd5dGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NDU1MTAsImV4cCI6MjA2ODAyMTUxMH0.jcPhEvr83w1CJYmyen6k354U2riN3-76WcOmppFsbvg";

const supabaseClient = supabase.createClient(SUPABASE_URL, API_KEY);

// ========== DOM ==========
const sendBtn = document.getElementById("sendBtn");
const fetchBtn = document.getElementById("fetchBtn");
const inboxBtn = document.getElementById("inboxBtn");
const backupBtn = document.getElementById("backupBtn");
const secretInput = document.getElementById("secretInput");
const secretType = document.getElementById("secretType");
const secretWarningPrivate = document.getElementById("secret-warning-private");
const secretWarningPublic = document.getElementById("secret-warning-public");
const sendMsg = document.getElementById("sendMsg");
const feed = document.getElementById("latest-secrets-feed");
const feedLoading = document.getElementById("feed-loading");
const inboxNotification = document.getElementById("inbox-notification");

// ========== RASTGELE NICKNAME ÜRETECİ ==========
// (Çakışmayı önlemek için basit + rastgele 4 haneli kod)
const ADJECTIVES = ["Mavi", "Kızıl", "Gizli", "Sessiz", "Hızlı", "Uykulu", "Cesur", "Kurnaz", "Mutlu", "Yorgun"];
const NOUNS = ["Tilki", "Kaplan", "Panda", "Gezgin", "Sincap", "Casus", "Dağcı", "Yolcu", "Düşünür", "Balık"];
function generateNickname() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const code = Math.random().toString(36).substring(2, 6); // 4 haneli rastgele kod
  return `${adj} ${noun} ${code}`;
}

// ========== KRİPTO (E2EE) YARDIMCI FONKSİYONLARI ==========
// (Web Crypto API fonksiyonları)
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes.buffer;
}
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}
// YENİ: E2EE Anahtar Çifti (Key Pair) Üretir (ECDH)
async function generateE2EEKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return { publicKeyJwk, privateKeyJwk };
}

// --- Sohbet (ECDH + AES-GCM) Kripto Fonksiyonları ---
async function importPrivateKey(jwk) {
  return await crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
}
async function importPublicKey(jwk) {
  return await crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []);
}
async function deriveSharedSecret(privateKey, publicKeyJwk) {
  const publicKey = await importPublicKey(publicKeyJwk);
  return await crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}
// Sohbet Mesajı Şifreleme
async function encryptChatMessage(text, sharedSecret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    sharedSecret,
    encodedText
  );
  return {
    encrypted_content: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv)
  };
}
// Sohbet Mesajı Şifre Çözme
async function decryptChatMessage(encryptedBase64, ivBase64, sharedSecret) {
   try {
    const iv = base64ToArrayBuffer(ivBase64);
    const encryptedData = base64ToArrayBuffer(encryptedBase64);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      sharedSecret,
      encryptedData
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    console.error("Chat Decryption error:", e);
    return "[DECRYPTION FAILED]";
  }
}

// ========== YENİ: LOCALSTORAGE (Veritabanı) YÖNETİMİ ==========
// (Artık tüm "kimliğimiz" burası)

// Anahtar: "onescrt_keys"
// Değer: {
//   my_secrets: [
//     { secret_id: 123, nickname: "Mavi Tilki", public_key_for_replies: {...}, private_key_for_replies: {...} }
//   ],
//   blocked_keys: [ "..." ],
//   viewer_id: "anon-uuid-...",
//   last_inbox_check: "timestamp"
// }

function getLocalDatabase() {
  let db = localStorage.getItem("onescrt_keys");
  if (!db) {
    db = {
      my_secrets: [],
      blocked_keys: [],
      viewer_id: `anon-${crypto.randomUUID()}`,
      last_inbox_check: new Date(0).toISOString() // Çok eski bir tarih
    };
    localStorage.setItem("onescrt_keys", JSON.stringify(db));
  }
  return JSON.parse(db);
}

function saveLocalDatabase(db) {
  localStorage.setItem("onescrt_keys", JSON.stringify(db));
}

// YENİ: Gönderdiğimiz bir sırrın anahtarlarını kaydeder
function saveMySecretKeys(secret_id, nickname, replyKeyPair) {
  const db = getLocalDatabase();
  db.my_secrets.push({
    secret_id: secret_id,
    nickname: nickname,
    public_key_for_replies: replyKeyPair.publicKeyJwk,
    private_key_for_replies: replyKeyPair.privateKeyJwk
  });
  saveLocalDatabase(db);
}

// ========== ARAYÜZ YARDIMCI FONKSİYONLARI ==========
function lock(btn, state = true) {
  if (!btn) return;
  btn.disabled = state;
  btn.classList.toggle("opacity-50", state);
  btn.classList.toggle("cursor-not-allowed", state);
}
function toast(msg, type = "info") {
  const div = document.createElement("div");
  div.textContent = msg;
  div.className =
    "fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg text-sm text-white z-50 " +
    (type === "error" ? "bg-red-600" : type === "success" ? "bg-green-600" : "bg-gray-700");
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// ========== ANA FONKSİYONLAR (AŞAMA 1) ==========

// YENİ: Public/Private Seçeneğini Dinle
secretType.addEventListener("change", () => {
  if (secretType.value === "public") {
    secretWarningPrivate.classList.add("hidden");
    secretWarningPublic.classList.remove("hidden");
  } else {
    secretWarningPrivate.classList.remove("hidden");
    secretWarningPublic.classList.add("hidden");
  }
});

// YENİ: Sır Gönderme (Model B - Yarı Hibrit)
async function submitSecret() {
  const content = secretInput.value.trim();
  const isPublic = secretType.value === "public";
  
  if (content.length < 30) {
    toast("Secret must be at least 30 characters.", "error");
    return;
  }
  
  lock(sendBtn, true);
  lock(fetchBtn, true); // Gönderme sırasında her şeyi kilitle
  
  try {
    const nickname = generateNickname();
    const replyKeyPair = await generateE2EEKeyPair(); // (Cevaplar için)
    
    // UZLAŞMA (AŞAMA 1):
    // Admin'in sırrı okuyamaması ("content_encrypted") özelliği,
    // "Get a Random Private Secret" ile çeliştiği için AŞAMA 2'ye ertelendi.
    // ŞİMDİLİK TÜM SIRLARIN İÇERİĞİ 'content' SÜTUNUNA AÇIK YAZILACAK.
    // Ancak 'client_id' olmadığı için admin YİNE DE KİMİN GÖNDERDİĞİNİ BİLMEYECEK.
    
    let payload = {
      nickname: nickname,
      is_public: isPublic,
      public_key_for_replies: JSON.stringify(replyKeyPair.publicKeyJwk),
      content: content // ŞİMDİLİK TÜM İÇERİK BURADA
    };
    
    // 1. Sırrı veritabanına gönder
    const { data, error } = await supabaseClient
      .from('secrets')
      .insert(payload)
      .select('id') // Gönderdiğimiz sırrın ID'sini geri al
      .single();
        
    if (error) throw new Error(error.message);
    
    // 2. Kendi anahtarlarımızı (sır ID'si ile eşleştirip) local'e kaydet
    saveMySecretKeys(data.id, nickname, replyKeyPair);
    
    // 3. Arayüzü güncelle
    secretInput.value = "";
    sendMsg.classList.remove("hidden");
    localStorage.setItem("hasSentSecret", "true"); // (fetchBtn'i açmak için)
    updateBtnStates();
    toast("✅ Secret submitted! Your keys are saved locally.", "success");
    
    // 4. "Latest Secrets" (Public) feed'ini yenile (eğer public gönderdiysek)
    if (isPublic) {
      loadLatestSecretsFeed(); 
    }
      
  } catch (e) {
    toast("Error submitting secret: " + e.message, "error");
  } finally {
    lock(sendBtn, false);
    updateBtnStates(); // (fetchBtn'i aç/kapa)
  }
}

// YENİ: "Latest Secrets" (Public) Feed'ini Yükler
async function loadLatestSecretsFeed() {
  feedLoading.classList.remove("hidden");
  feed.innerHTML = ""; // Temizle
  
  try {
    const { data, error } = await supabaseClient
      .from('secrets')
      .select('id, nickname, content, public_key_for_replies')
      .eq('is_public', true) // Sadece Public olanları çek
      .order('created_at', { ascending: false })
      .limit(20); // Son 20
      
    if (error) throw new Error(error.message);
    
    if (data.length === 0) {
      feedLoading.textContent = "No public secrets yet. Be the first!";
      return;
    }
    
    feedLoading.classList.add("hidden");
    
    data.forEach(secret => {
      const div = document.createElement("div");
      div.className = "bg-gray-800 p-3 rounded-lg";
      div.innerHTML = `
        <p class="text-sm text-white whitespace-pre-line break-words">
          ${secret.content.substring(0, 100)}...
        </p>
        <div class="flex justify-between items-center mt-2">
          <span class="text-xs text-cyan-400 font-semibold">${secret.nickname}</span>
          <button data-secret-id="${secret.id}" data-nickname="${secret.nickname}" data-content="${escape(secret.content)}" data-public-key='${secret.public_key_for_replies}' class="reply-to-public-btn text-xs bg-cyan-600 hover:bg-cyan-700 text-white py-1 px-2 rounded">
            Reply
          </button>
        </div>
      `;
      feed.appendChild(div);
    });
    
  } catch (e) {
    feedLoading.textContent = "Error loading feed.";
    toast("Error loading feed: " + e.message, "error");
  }
}

// YENİ: "Get a Private Secret" (Eski fetchBtn)
async function fetchPrivateSecret() {
  lock(fetchBtn, true);
  const db = getLocalDatabase();
  
  try {
    // 1. Kendi gördüğümüz private sırların ID'lerini çek
    const { data: seenData, error: seenError } = await supabaseClient
      .from('secret_views')
      .select('secret_id')
      .eq('viewer_id', db.viewer_id);
      
    if (seenError) throw new Error("Could not fetch viewed secrets: " + seenError.message);
    const seenIds = seenData.map(r => r.secret_id);
    
    // 2. Kendi sırlarımızın ID'lerini çek (local'den)
    const mySecretIds = db.my_secrets.map(s => s.secret_id);
    
    // 3. Filtrelenmiş sırrı çek
    const { data, error } = await supabaseClient
      .from('secrets')
      .select('id, nickname, content, public_key_for_replies')
      .eq('is_public', false) // Sadece Private olanları çek
      .not('id', 'in', `(${[...mySecretIds, ...seenIds].join(',') || 0})`) // Kendi sırlarımız VE gördüklerimiz hariç
      .limit(50) // (Havuz)
      .range(0, 49);

    if (error) throw new Error("Fetch failed: " + error.message);

    const unseen = data.filter(item => !seenIds.includes(item.id) && !mySecretIds.includes(item.id));
    
    if (unseen.length > 0) {
      const randomSecret = unseen[Math.floor(Math.random() * unseen.length)];
      
      // 4. Görüldü olarak işaretle
      const { error: viewError } = await supabaseClient
        .from('secret_views')
        .insert({ secret_id: randomSecret.id, viewer_id: db.viewer_id });
        
      if (viewError) console.warn("Could not mark secret as viewed:", viewError.message);

      // 5. Modalı göster
      showSecretModal(randomSecret, "private");
      
      localStorage.setItem("hasFetchedSecret", "true");
      updateBtnStates();
      
    } else {
      toast("No new private secrets found to fetch.", "error");
      lock(fetchBtn, false); // Tekrar denemesine izin ver
    }
    
  } catch (e) {
    toast("Error fetching private secret: " + e.message, "error");
    lock(fetchBtn, false);
  }
}

// YENİ: Modal (Hem Public hem Private için)
function showSecretModal(secretObject, type = "public") {
  
  const { id: secret_id, nickname, content, public_key_for_replies } = secretObject;
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4";
  
  const modal = document.createElement("div");
  modal.className = "bg-gray-900 text-white max-w-lg w-full rounded-xl shadow-xl p-6 text-left";
  modal.innerHTML = `
    <p class="text-sm ${type === 'private' ? 'text-red-400' : 'text-cyan-400'} mb-4 text-center">
      You are viewing a ${type.toUpperCase()} secret from ${nickname}.
    </p>
    <p class="text-lg font-mono mb-6 whitespace-pre-line break-words bg-gray-800 p-4 rounded">${content}</p>
    <h4 class="font-semibold text-lg mb-2 text-cyan-300">Anonymous Reply to ${nickname}</h4>
    <textarea id="replyTextarea" rows="3" class="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400" placeholder="Write an encrypted reply..."></textarea>
    <button id="replyBtn" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded transition duration-300 mt-3 w-full">
      Send Reply (E2E Encrypted)
    </button>
    <hr class="border-gray-700 my-6">
    <div class="flex justify-center gap-4">
      <button id="copyBtn" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold">Copy Secret</button>
      <button id="closeBtn" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold">Close</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Modal butonları
  modal.querySelector("#closeBtn").addEventListener("click", () => overlay.remove());
  modal.querySelector("#copyBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(content); toast("Copied!", "success"); } 
    catch { toast("Failed to copy", "error"); }
  });
  
  // CEVAP GÖNDERME (ÇİFT YÖNLÜ SOHBET ALTYAPISI)
  modal.querySelector("#replyBtn").addEventListener("click", async () => {
    const replyContent = modal.querySelector("#replyTextarea").value.trim();
    if (replyContent.length < 5) {
      toast("Reply must be at least 5 characters.", "error");
      return;
    }
    
    const replyBtn = modal.querySelector("#replyBtn");
    lock(replyBtn, true);
    replyBtn.textContent = "Encrypting... Generating keys...";
    
    try {
      // 1. Cevap verebilmek için BİZ de bir anahtar çifti üretmeliyiz
      const myReplyKeyPair = await generateE2EEKeyPair();
      const myNickname = generateNickname(); // Bizim de bu sohbet için rastgele bir nick'imiz olmalı
      
      // 2. Alıcının (sır sahibinin) public key'ini al
      const recipientReplyKeyJwk = JSON.parse(public_key_for_replies);
      
      // 3. Paylaşımlı bir gizli anahtar (shared secret) türet
      const myPrivateKey = await importPrivateKey(myReplyKeyPair.privateKeyJwk);
      const sharedSecret = await deriveSharedSecret(myPrivateKey, recipientReplyKeyJwk);
      
      // 4. Mesajı bu paylaşımlı anahtarla şifrele
      const { encrypted_content, iv } = await encryptChatMessage(replyContent, sharedSecret);
      
      // 5. Veritabanına göndereceğimiz paketi hazırla
      const messagePayload = {
        secret_id: secret_id,
        sender_nickname: myNickname,
        sender_public_key: JSON.stringify(myReplyKeyPair.publicKeyJwk), // Sır sahibinin BİZE cevap atabilmesi için
        encrypted_content: encrypted_content,
        iv: iv
      };
      
      // 6. Mesajı gönder
      const { error: msgError } = await supabaseClient
        .from('messages')
        .insert(messagePayload);
        
      if (msgError) throw new Error("Message could not be sent: " + msgError.message);
      
      toast("Encrypted reply sent!", "success");
      modal.querySelector("#replyTextarea").value = "";
      
    } catch(e) {
      toast("Error sending reply: "D + e.message, "error");
    } finally {
      lock(replyBtn, false);
      replyBtn.textContent = "Send Reply (E2E Encrypted)";
    }
  });
}

// YENİ: "Inbox" (Komple Yeniden Yazıldı)
async function showInboxModal() {
  const db = getLocalDatabase();
  
  if (db.my_secrets.length === 0) {
    toast("You have not submitted any secrets yet. No inbox found.", "error");
    return;
  }
  
  const overlay = document.createElement("div");
  // ... (Modal HTML'i - Plan 8: Nicke göre gruplama)
  overlay.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4";
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  
  const modal = document.createElement("div");
  modal.className = "bg-gray-900 text-white max-w-2xl w-full rounded-xl shadow-xl p-6 h-3/4 flex flex-col";
  modal.innerHTML = `
    <h3 class="text-2xl font-bold text-cyan-300 mb-4">Anonymous Inbox</h3>
    <p class="text-sm text-gray-400 mb-4">These conversations are linked to the secrets you posted. They are stored in your browser. Use 'Backup' to save them.</p>
    <div class="flex-grow flex gap-4 overflow-hidden">
      <div id="inbox-convo-list" class="w-1/3 h-full bg-gray-800 rounded-lg p-2 overflow-y-auto space-y-2">
        <div id="inbox-loading" class="text-center p-4">Loading conversations...</div>
      </div>
      <div id="inbox-message-panel" class="w-2/3 h-full bg-gray-800 rounded-lg p-4 flex flex-col">
        <div id="message-feed" class="flex-grow overflow-y-auto space-y-3 mb-3">
          <p class="text-gray-400">Select a conversation to read messages.</p>
        </div>
        <div id="inbox-reply-area" class="flex-shrink-0 flex gap-2 hidden">
          <textarea id="inboxReplyText" rows="2" class="w-full p-2 rounded bg-gray-900 border border-gray-700" placeholder="Write an encrypted reply..."></textarea>
          <button id="inboxReplyBtn" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 rounded-lg">Send</button>
        </div>
      </div>
    </div>
    <button id="inbox-close" class="mt-4 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold w-full">Close</button>
  `;
  modal.querySelector("#inbox-close").addEventListener("click", () => overlay.remove());
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const convoListEl = modal.querySelector("#inbox-convo-list");
  const loadingEl = modal.querySelector("#inbox-loading");
  
  try {
    // 1. Kendi sırlarımızın ID'lerini al
    const mySecretIds = db.my_secrets.map(s => s.secret_id);
    if (mySecretIds.length === 0) {
      loadingEl.textContent = "No secrets found.";
      return;
    }
    
    // 2. Bu sır ID'lerine gelen TÜM mesajları RPC ile çek
    const { data: messages, error } = await supabaseClient
      .rpc('get_my_messages_by_secret_ids', { secret_ids: mySecretIds });
      
    if (error) throw new Error("Could not fetch messages: " + error.message);
    
    loadingEl.style.display = 'none';
    if (messages.length === 0) {
      convoListEl.innerHTML = `<p class="text-gray-400 p-2 text-center">No replies yet.</p>`;
      return;
    }
    
    // 3. Mesajları SOHBET bazında GÜVENLİCE grupla
    // (Aynı 'sender_public_key' ve 'secret_id' = 1 sohbet)
    const conversations = {};
    for (const msg of messages) {
      const convoId = `${msg.secret_id}:${msg.sender_public_key}`; // Biricik sohbet ID'si
      
      if (!conversations[convoId]) {
        conversations[convoId] = {
          secret_id: msg.secret_id,
          sender_nickname: msg.sender_nickname,
          sender_public_key: msg.sender_public_key,
          messages: []
        };
      }
      conversations[convoId].messages.push(msg);
    }

    // 4. Sohbet listesini (sol panel) doldur
    for (const convoId in conversations) {
      const convo = conversations[convoId];
      // Son mesajın tarihine göre sırala (yeni olan üste)
      convo.messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const div = document.createElement("div");
      div.className = "p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-700";
      div.innerHTML = `
        <div class="font-semibold text-white">${convo.sender_nickname}</div>
        <div class="text-xs text-gray-400">${convo.messages.length} message(s)</div>
      `;
      
      // Sohbet listesindeki bir öğeye tıklandığında...
      div.addEventListener("click", async () => {
        // Diğerlerini "seçilmemiş" yap
        Array.from(convoListEl.children).forEach(child => child.classList.remove('bg-cyan-900'));
        // Bunu "seçilmiş" yap
        div.classList.add('bg-cyan-900');
        await loadConversation(modal, convo, myReplyKeyPair); // (ÇİFT YÖNLÜ SOHBET İÇİN DÜZENLENDİ)
      });
      convoListEl.appendChild(div);
    }
    
    // 5. Bildirim noktasını kontrol et
    checkNotifications(messages, db);

  } catch (e) {
    loadingEl.textContent = "Error loading inbox: " + e.message;
  }
}

// YENİ: Seçilen Sohbeti Yükler (Inbox içindeki sağ panel)
async function loadConversation(modal, convo) {
  const messageFeed = modal.querySelector("#message-feed");
  const replyArea = modal.querySelector("#inbox-reply-area");
  const replyBtn = modal.querySelector("#inboxReplyBtn");
  const replyText = modal.querySelector("#inboxReplyText");
  
  messageFeed.innerHTML = `<p class="text-gray-400">Decrypting messages from ${convo.sender_nickname}...</p>`;
  
  try {
    // 1. Bu sohbet için doğru local anahtarları bul
    const db = getLocalDatabase();
    const mySecret = db.my_secrets.find(s => s.secret_id === convo.secret_id);
    if (!mySecret) throw new Error("Local private key for this secret not found!");
    
    // 2. Paylaşımlı gizli anahtarı (shared secret) türet
    // (Bizim private key'imiz ve gönderenin public key'i ile)
    const myReplyPrivateKey = await importPrivateKey(mySecret.private_key_for_replies);
    const senderPublicKey = JSON.parse(convo.sender_public_key);
    const sharedSecret = await deriveSharedSecret(myReplyPrivateKey, senderPublicKey);
    
    // 3. Mesajların şifresini çöz ve göster
    messageFeed.innerHTML = ""; // Temizle
    for (const msg of convo.messages) {
      const decryptedText = await decryptChatMessage(msg.encrypted_content, msg.iv, sharedSecret);
      const msgDiv = document.createElement("div");
      // (AŞAMA 2'de: 'my_reply' class'ı eklenerek sağa yaslanacak)
      msgDiv.className = "p-2 bg-gray-900 rounded-lg"; 
      msgDiv.innerHTML = `
        <p class="text-xs text-cyan-400">${convo.sender_nickname} (${new Date(msg.created_at).toLocaleTimeString()})</p>
        <p class="text-white whitespace-pre-line break-words">${decryptedText}</p>
      `;
      messageFeed.appendChild(msgDiv);
    }
    
    // 4. "Bu sohbete cevap ver" alanını göster ve aktif et
    replyArea.classList.remove("hidden");
    replyText.value = "";
    
    replyBtn.onclick = async () => {
      const replyContent = replyText.value.trim();
      if (replyContent.length < 2) {
        toast("Reply must be at least 2 characters.", "error");
        return;
      }
      
      lock(replyBtn, true);
      
      try {
        // Çift Yönlü Sohbet için:
        // Bu sefer, biz BİR MESAJ gönderiyoruz, SIRA DEĞİL.
        // Ama altyapı aynı: Alıcının (sender_public_key) anahtarıyla şifrele.
        // Gönderen (bizim) anahtarımız (myReplyPrivateKey)
        // 'sharedSecret' zaten bu ikisi arasında türetilmişti.
        
        const { encrypted_content, iv } = await encryptChatMessage(replyContent, sharedSecret);

        const messagePayload = {
          secret_id: convo.secret_id, // Hangi sır üzerinden başladığını bilmeli
          sender_nickname: mySecret.nickname, // Bu sefer GÖNDEREN BİZİZ
          sender_public_key: JSON.stringify(mySecret.public_key_for_replies), // ALICININ BİZE CEVAP ATABİLMESİ İÇİN
          encrypted_content: encrypted_content,
          iv: iv
        };
        
        const { error: msgError } = await supabaseClient
          .from('messages')
          .insert(messagePayload);
          
        if (msgError) throw new Error("Reply could not be sent: " + msgError.message);
        
        // Arayüze kendi mesajımızı manuel ekle
        const msgDiv = document.createElement("div");
        msgDiv.className = "p-2 bg-cyan-900 rounded-lg"; // (Bizim mesajımız - farklı renk)
        msgDiv.innerHTML = `
          <p class="text-xs text-gray-200">Me (${mySecret.nickname}) (now)</p>
          <p class="text-white whitespace-pre-line break-words">${replyContent}</p>
        `;
        messageFeed.appendChild(msgDiv);
        replyText.value = "";
        
      } catch (e) {
        toast("Error sending reply: " + e.message, "error");
      } finally {
        lock(replyBtn, false);
      }
    };
    
  } catch(e) {
    messageFeed.innerHTML = `<p class="text-red-400">Error decrypting conversation: ${e.message}</p>`;
  }
}

// YENİ: Bildirimleri Kontrol Et
function checkNotifications(allMessages, db) {
  const lastCheck = new Date(db.last_inbox_check);
  let hasNewMessage = false;
  
  // Bize ait olmayan mesajları (yani bize gelenleri) bul
  const myPublicKeys = db.my_secrets.map(s => JSON.stringify(s.public_key_for_replies));
  
  for (const msg of allMessages) {
    // Eğer mesajın gönderen anahtarı, bizim anahtarlarımızdan BİRİ DEĞİLSE, bu bize gelmiş bir mesajdır
    if (!myPublicKeys.includes(msg.sender_public_key)) {
      if (new Date(msg.created_at) > lastCheck) {
        hasNewMessage = true;
        break;
      }
    }
  }
  
  if (hasNewMessage) {
    inboxNotification.classList.remove("hidden");
  } else {
    inboxNotification.classList.add("hidden");
  }
  
  // Görüldü olarak işaretle (Modal açıldığında)
  db.last_inbox_check = new Date().toISOString();
  saveLocalDatabase(db);
}

// YENİ: Yedekleme ve Geri Yükleme (Plan 9 - Kırılganlık Çözümü)
async function backupKeys() {
  const db = getLocalDatabase();
  if (db.my_secrets.length === 0 && db.blocked_keys.length === 0) {
    toast("Nothing to backup. Send a secret first.", "error");
    return;
  }
  
  const password = prompt("Enter a strong password to encrypt your backup file:");
  if (!password || password.length < 6) {
    toast("Backup cancelled. Password must be at least 6 characters.", "error");
    return;
  }
  
  try {
    // 1. Anahtarı paroladan türet (PBKDF2)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    const aesKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt"]
    );
    
    // 2. Veritabanını (JSON string) şifrele
    const dbString = JSON.stringify(db);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      new TextEncoder().encode(dbString)
    );
    
    // 3. İndirilebilir dosyayı oluştur
    const backupPayload = {
      salt: arrayBufferToBase64(salt),
      iv: arrayBufferToBase64(iv),
      data: arrayBufferToBase64(encryptedData)
    };
    
    const blob = new Blob([JSON.stringify(backupPayload)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `onescrt-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    toast("✅ Backup file encrypted and downloaded!", "success");
    
  } catch (e) {
    toast("Backup failed: " + e.message, "error");
  }
}

async function restoreKeys() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";
  
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const password = prompt("Enter the password for your backup file:");
    if (!password) {
      toast("Restore cancelled.", "info");
      return;
    }
    
    try {
      const backupPayload = JSON.parse(await file.text());
      const salt = base64ToArrayBuffer(backupPayload.salt);
      const iv = base64ToArrayBuffer(backupPayload.iv);
      const data = base64ToArrayBuffer(backupPayload.data);
      
      // 1. Anahtarı paroladan türet
      const keyMaterial = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
      );
      const aesKey = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["decrypt"]
      );
      
      // 2. Verinin şifresini çöz
      const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        data
      );
      
      // 3. Veritabanını local'e kaydet
      const dbString = new TextDecoder().decode(decryptedData);
      JSON.parse(dbString); // (Geçerli JSON mu diye kontrol et)
      
      if (confirm("Restore successful. This will OVERWRITE your current keys. Continue?")) {
        localStorage.setItem("onescrt_keys", dbString);
        toast("✅ Restore Complete! Refreshing page...", "success");
        setTimeout(() => location.reload(), 1500);
      } else {
        toast("Restore cancelled.", "info");
      }
      
    } catch (e) {
      toast("Restore failed. Invalid file or wrong password.", "error");
    }
  };
  
  fileInput.click();
}

// YENİ: Yedekleme Butonunu Ayarla
backupBtn.addEventListener("click", () => {
  if (confirm("Backup: Download an encrypted file of your keys.\nRestore: Use a backup file.\n\nDo you want to BACKUP (OK) or RESTORE (Cancel)?")) {
    backupKeys();
  } else {
    restoreKeys();
  }
});


// YENİ: Buton Durumlarını Güncelle (Model B)
function updateBtnStates() {
  const hasSent = localStorage.getItem("hasSentSecret") === "true";
  const hasFetched = localStorage.getItem("hasFetchedSecret") === "true";

  if (hasFetched) {
    lock(fetchBtn, true); // Sadece bir private sır alabilir (şimdilik)
  } else {
    lock(fetchBtn, !hasSent); // Gönderdiyse aç
  }
  
  lock(sendBtn, false); // Gönderme her zaman açık
}

// YENİ: Feed'deki "Reply" butonlarına tıklama (Olay delegasyonu)
document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("reply-to-public-btn")) {
    const secret = {
      id: e.target.dataset.secretId,
      nickname: e.target.dataset.nickname,
      content: unescape(e.target.dataset.content), // 'escape' ile saklanan içeriği geri çöz
      public_key_for_replies: e.target.dataset.publicKey
    };
    showSecretModal(secret, "public");
  }
});


// ========== SAYFA YÜKLENİNCE (AŞAMA 1) ==========
window.addEventListener("DOMContentLoaded", () => {
  // Butonları bağla
  sendBtn.addEventListener("click", submitSecret);
  fetchBtn.addEventListener("click", fetchPrivateSecret);
  inboxBtn.addEventListener("click", showInboxModal);
  
  // Durumları ayarla
  updateBtnStates();
  
  // "Latest Secrets" (Public) feed'ini yükle
  loadLatestSecretsFeed();
  
  // Arka planda bildirimleri kontrol et
  const db = getLocalDatabase();
  const mySecretIds = db.my_secrets.map(s => s.secret_id);
  if (mySecretIds.length > 0) {
    supabaseClient
      .rpc('get_my_messages_by_secret_ids', { secret_ids: mySecretIds })
      .then(({ data }) => {
        if (data) checkNotifications(data, db);
      });
  }
});
