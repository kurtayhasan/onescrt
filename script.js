// =========================================================================================
// ONESCRT - NİHAİ KOD (POW Çözümü, Inbox Grup Mantığı ve Vibe Düzeltmeleri Dahil)
// =========================================================================================

// ========== CONFIG (FINAL) ==========
const SUPABASE_URL = "https://ukalifoxsciqbeyrupmu.supabase.co"; 
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrYWxpZm94c2NpcWJleXJ1cG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzkxNjAsImV4cCI6MjA3ODIxNTE2MH0.7bqIlsYIiooYb-zC29FYscjePWpfRrQY_d_01w756Gk";

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

// ========== RASTGELE NICKNAME ÜRETECİ (İNGİLİZCE) ==========
const ADJECTIVES = ["Blue", "Red", "Secret", "Silent", "Swift", "Sleepy", "Brave", "Cunning", "Happy", "Tired", "Mystic", "Clever"];
const NOUNS = ["Fox", "Tiger", "Panda", "Wanderer", "Squirrel", "Spy", "Climber", "Traveler", "Thinker", "Fisher", "Ghost", "Wizard"];
function generateNickname() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const code = Math.random().toString(36).substring(2, 6); 
  return `${adj} ${noun} ${code}`;
}

// ========== KRİPTO (E2EE) YARDIMCI FONKSİYONLARI ==========
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
function getLocalDatabase() {
  let dbString = localStorage.getItem("onescrt_keys");
  
  if (dbString && dbString.startsWith('{')) {
    return JSON.parse(dbString);
  }

  if (!dbString || dbString.startsWith('[') || !dbString.startsWith('{')) {
    console.warn("Local storage key bozuk veya eksik. Yeni database oluşturuluyor.");
    let db = {
      my_secrets: [],
      blocked_keys: [], // Engellenenler listesi
      viewer_id: `anon-${crypto.randomUUID()}`,
      last_inbox_check: new Date(0).toISOString()
    };
    saveLocalDatabase(db);
    return db;
  }
  
  try {
    return JSON.parse(dbString);
  } catch (e) {
    console.error("Kritik Hata: Local storage verisi okunamıyor. Yeni database oluşturuluyor.", e);
    let db = {
      my_secrets: [],
      blocked_keys: [],
      viewer_id: `anon-${crypto.randomUUID()}`,
      last_inbox_check: new Date(0).toISOString()
    };
    saveLocalDatabase(db);
    return db;
  }
}

function saveLocalDatabase(db) {
  localStorage.setItem("onescrt_keys", JSON.stringify(db)); 
}

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

// YENİ: ENGELLEME İŞLEMLERİ
function isBlocked(publicKeyJwk) {
    const db = getLocalDatabase();
    return db.blocked_keys.includes(JSON.stringify(publicKeyJwk));
}
function toggleBlock(publicKeyJwk, nickname) {
    const db = getLocalDatabase();
    const keyString = JSON.stringify(publicKeyJwk);
    
    if (db.blocked_keys.includes(keyString)) {
        db.blocked_keys = db.blocked_keys.filter(k => k !== keyString);
        saveLocalDatabase(db);
        toast(`${nickname} unblocked.`, "info");
        return false;
    } else {
        db.blocked_keys.push(keyString);
        saveLocalDatabase(db);
        toast(`${nickname} blocked! Their messages will be hidden.`, "error");
        return true;
    }
}


// ========== YENİ: PROOF-OF-WORK (POW) SPAM KORUMASI - NİHAİ ÇÖZÜM ==========
const DIFFICULTY = 4; // Hash'in ilk 4 hanesi '0' olmalı
const TARGET_PREFIX = '0'.repeat(DIFFICULTY);
const ENCODER = new TextEncoder();

// ArrayBuffer'ı Base64 string'e çeviren yardımcı fonksiyon
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

async function sha256(str) {
  const buffer = ENCODER.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// NİHAİ POW ÇÖZÜMÜ: Base64 String'i ve Hash'i Birlikte Döndürür
async function solveProofOfWork(payload) {
    // 1. Payload'ı JSON string'e çevir
    const jsonString = JSON.stringify(payload);
    
    // 2. JSON string'ini ArrayBuffer'a çevir
    const buffer = ENCODER.encode(jsonString);
    
    // 3. ArrayBuffer'ı Base64 string'e çevir (Sunucuyla eşleşmeyi GARANTİ eden string)
    const base64String = arrayBufferToBase64(buffer); 
    
    let nonce = 0;
    let hash = '';
    
    while (!hash.startsWith(TARGET_PREFIX)) {
        nonce++;
        // HASH hesaplamasını Base64 string'i üzerinde yap
        const attempt = base64String + nonce;
        hash = await sha256(attempt);
        
        if (nonce % 5000 === 0) {
            await new Promise(r => setTimeout(r, 0)); // Tarayıcıyı kısa süre serbest bırak
        }
    }
    // HASH EŞLEŞMESİ İÇİN KRİTİK: HASH'LENEN STRING'İ DE GERİ DÖNDÜR
    return { nonce, hash, base64String }; 
}

// ========== ARAYÜZ YARDIMCI FONKSİYONLARI ==========
function lock(btn, state = true, msg = null) {
  if (!btn) return;
  btn.disabled = state;
  btn.classList.toggle("opacity-50", state);
  btn.classList.toggle("cursor-not-allowed", state);
  if (msg) btn.textContent = msg;
  else btn.textContent = state ? "Processing..." : "Submit Secret";
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

// ========== ANA FONKSİYONLAR (AŞAMA 3) ==========

secretType.addEventListener("change", () => {
  if (secretType.value === "public") {
    secretWarningPrivate.classList.add("hidden");
    secretWarningPublic.classList.remove("hidden");
  } else {
    secretWarningPrivate.classList.remove("hidden");
    secretWarningPublic.classList.add("hidden");
  }
});

// YENİ: Sır Gönderme
async function submitSecret() {
  const content = secretInput.value.trim();
  const isPublic = secretType.value === "public";
  
  if (content.length < 30) {
    toast("Secret must be at least 30 characters.", "error");
    return;
  }
  
  lock(sendBtn, true, "Calculating Proof-of-Work (Spam Guard)...");
  
  try {
    const nickname = generateNickname();
    const replyKeyPair = await generateE2EEKeyPair(); 
    
    let payload = {
      nickname: nickname,
      is_public: isPublic,
      public_key_for_replies: JSON.stringify(replyKeyPair.publicKeyJwk),
      content: content,
      // KENDİ KENDİNİ İMHA SÜRESİ
      expires_at: isPublic ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
    };
    
    // 1. Proof-of-Work Hesapla (Yeni base64String'i yakala)
    const { nonce, hash, base64String } = await solveProofOfWork(payload);
    
    payload.pow_nonce = nonce;
    payload.pow_hash = hash;
    payload.pow_string_base64 = base64String; // SUNUCU KONTROLÜ İÇİN BASE64 STRING'İ EKLE
    
    // 2. Sırrı veritabanına gönder
    lock(sendBtn, true, "Submitting Secret...");
    const { data, error } = await supabaseClient
      .from('secrets')
      .insert(payload)
      .select('id') 
      .single();
        
    if (error) throw new Error(error.message);
    
    saveMySecretKeys(data.id, nickname, replyKeyPair);
    
    secretInput.value = "";
    sendMsg.classList.remove("hidden");
    updateBtnStates();
    
    let confirmationMsg = "✅ Secret submitted! Your keys are saved locally.";
    if (isPublic) {
        confirmationMsg += " (This secret will self-destruct in 7 days)";
    }
    toast(confirmationMsg, "success");
    
    if (isPublic) {
      loadLatestSecretsFeed(); 
    }
      
  } catch (e) {
    toast("Error submitting secret: " + e.message, "error");
  } finally {
    lock(sendBtn, false, "Submit Secret");
    updateBtnStates();
  }
}

// YENİ: "Latest Secrets" (Public) Feed'ini Yükler (POPÜLER SIRLAR EKLENDİ)
async function loadLatestSecretsFeed() {
  feedLoading.classList.remove("hidden");
  feed.innerHTML = "";
  
  try {
    // 1. Sırları Çek (Popüler Sırlar listesi için Top 3 eklendi)
    const { data: popularSecrets, error: popularError } = await supabaseClient
        .from('vibe_counts')
        .select('secret_id, vibe_type, count')
        .order('count', { ascending: false })
        .limit(3);
    
    const popularIds = popularSecrets ? [...new Set(popularSecrets.map(v => v.secret_id))] : [];

    // Top 20 en son sırrı çek
    const { data: latestSecrets, error: latestError } = await supabaseClient
      .from('secrets')
      .select('id, nickname, content, public_key_for_replies')
      .eq('is_public', true) 
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (latestError) throw new Error(latestError.message);
    
    if (latestSecrets.length === 0) {
      feedLoading.textContent = "No public secrets yet. Be the first!";
      return;
    }
    
    // 2. Tüm Tepkileri VIEW'den çek
    const secretIds = latestSecrets.map(s => s.id);
    const { data: vibesData, error: vibesError } = await supabaseClient
      .from('vibe_counts') 
      .select('secret_id, vibe_type, count')
      .in('secret_id', secretIds);

    if (vibesError) console.warn("Could not load vibes:", vibesError.message);
    
    // 3. Tepkileri sır ID'sine göre grupla
    const vibesMap = {};
    if (vibesData) {
        vibesData.forEach(v => {
            if (!vibesMap[v.secret_id]) vibesMap[v.secret_id] = {};
            vibesMap[v.secret_id][v.vibe_type] = v.count;
        });
    }

    feedLoading.classList.add("hidden");
    
    // 4. Feed'i Oluştur
    latestSecrets.forEach(secret => {
      const currentVibes = vibesMap[secret.id] || {};
      const isPopular = popularIds.includes(secret.id);
      
      const div = document.createElement("div");
      div.className = "bg-gray-800 p-3 rounded-lg border-2" + (isPopular ? " border-yellow-500 shadow-lg" : " border-gray-800"); // Popülerlik görseli
      div.innerHTML = `
        <p class="text-sm text-white whitespace-pre-line break-words">
          ${isPopular ? '<span class="text-yellow-400 font-bold mr-1">🔥 HOT:</span>' : ''}
          ${secret.content.substring(0, 100)}...
        </p>
        <div class="flex justify-between items-center mt-2">
          <span class="text-xs text-cyan-400 font-semibold">${secret.nickname}</span>
          <div class="flex items-center gap-3">
              <div class="flex gap-2">
                ${renderVibeButton(secret.id, 'love', '❤️', currentVibes['love'] || 0)}
                ${renderVibeButton(secret.id, 'shock', '🤯', currentVibes['shock'] || 0)}
                ${renderVibeButton(secret.id, 'funny', '😂', currentVibes['funny'] || 0)}
              </div>
              <button data-secret-id="${secret.id}" data-nickname="${secret.nickname}" data-content="${encodeURIComponent(secret.content)}" data-public-key='${secret.public_key_for_replies}' class="reply-to-public-btn text-xs bg-cyan-600 hover:bg-cyan-700 text-white py-1 px-2 rounded">
                Reply
              </button>
          </div>
        </div>
      `;
      feed.appendChild(div);
    });
    
  } catch (e) {
    feedLoading.textContent = "Error loading feed.";
    toast("Error loading feed: " + e.message, "error");
  }
}

// YENİ: Tepki Butonu HTML'i (Değişiklik Yok)
function renderVibeButton(secretId, vibeType, emoji, count) {
    return `
        <button 
            data-secret-id="${secretId}" 
            data-vibe-type="${vibeType}" 
            class="vibe-btn text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded-full transition duration-150 flex items-center gap-1"
            title="React with ${emoji}">
            ${emoji}<span class="vibe-count">${count}</span>
        </button>
    `;
}

// YENİ: Tepki Gönderme İşlemi (Hata Düzeltmeleri Dahil)
async function sendVibe(secretId, vibeType, button) {
    const db = getLocalDatabase();
    const countSpan = button.querySelector('.vibe-count');
    const initialCount = countSpan ? parseInt(countSpan.textContent) : 0;
    
    // VIBE DÜZELTMESİ: Butonu hemen kilitle
    lock(button, true, "..."); 
    
    const emojiMap = { 'love': '❤️', 'shock': '🤯', 'funny': '😂' };
    const emoji = emojiMap[vibeType] || '👍'; 

    try {
        const { error } = await supabaseClient
            .from('secret_vibes')
            .insert({
                secret_id: secretId,
                viewer_id: db.viewer_id, 
                vibe_type: vibeType
            });
            
        if (error) {
            if (error.code === '23505') { 
                 toast("You have already reacted to this secret.", "info");
                 button.disabled = true;
                 button.classList.add("opacity-50", "cursor-not-allowed");
                 return;
            }
            throw new Error(error.message);
        }
        
        // Başarılı olursa sayacı artır ve butonu kilitle
        if (countSpan) countSpan.textContent = initialCount + 1;
        
        toast(`Vibe ${emoji} sent!`, "success");
        button.disabled = true;
        button.classList.add("opacity-50", "cursor-not-allowed");
        
    } catch (e) {
        toast("Error sending vibe: " + e.message, "error");
    } finally {
        // Hata durumunda butonu aç ve eski sayısını göster
        if (!button.disabled) {
            lock(button, false, `${emoji}${countSpan ? countSpan.textContent : ''}`); 
        }
    }
}


// YENİ: "Get a Private Secret" (sessionStorage'a geçildi)
async function fetchPrivateSecret() {
  lock(fetchBtn, true, "Fetching...");
  const db = getLocalDatabase();
  
  try {
    const { data: seenData, error: seenError } = await supabaseClient
      .from('secret_views')
      .select('secret_id')
      .eq('viewer_id', db.viewer_id);
      
    if (seenError) throw new Error("Could not fetch viewed secrets: " + seenError.message);
    const seenIds = seenData.map(r => r.secret_id);
    
    const mySecretIds = db.my_secrets.map(s => s.secret_id);
    
    const { data, error } = await supabaseClient
      .from('secrets')
      .select('id, nickname, content, public_key_for_replies')
      .eq('is_public', false) 
      .not('id', 'in', `(${[...mySecretIds, ...seenIds].join(',') || 0})`) 
      .limit(50) 
      .range(0, 49);

    if (error) throw new Error("Fetch failed: " + error.message);

    const unseen = data.filter(item => !seenIds.includes(item.id) && !mySecretIds.includes(item.id));
    
    if (unseen.length > 0) {
      const randomSecret = unseen[Math.floor(Math.random() * unseen.length)];
      
      const { error: viewError } = await supabaseClient
        .from('secret_views')
        .insert({ secret_id: randomSecret.id, viewer_id: db.viewer_id });
        
      if (viewError) console.warn("Could not mark as seen:", viewError.message);

      showSecretModal(randomSecret, "private");
      
      // KRİTİK DEĞİŞİM: Sadece bu oturum için kilit koy
      sessionStorage.setItem("hasFetchedSecret", "true"); 
      updateBtnStates();
      
    } else {
      toast("No new private secrets found to fetch.", "error");
      lock(fetchBtn, false, "Get a Private Secret"); 
    }
    
  } catch (e) {
    toast("Error fetching private secret: " + e.message, "error");
    lock(fetchBtn, false, "Get a Private Secret");
  }
}

// YENİ: Modal (ENGELLEME EKLENDİ)
function showSecretModal(secretObject, type = "public") {
  
  const { id: secret_id, nickname, content, public_key_for_replies } = secretObject;
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4";
  
  const modal = document.createElement("div");
  modal.className = "bg-gray-900 text-white max-w-lg w-full rounded-xl shadow-xl p-6 text-left";
  
  // Engelleme durumunu kontrol et
  const recipientPublicKeyJwk = JSON.parse(public_key_for_replies);
  const isCurrentlyBlocked = isBlocked(recipientPublicKeyJwk);
  
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
    <div class="flex justify-between items-center gap-4">
      <button id="blockBtn" class="flex-grow bg-${isCurrentlyBlocked ? 'yellow' : 'red'}-600 hover:bg-${isCurrentlyBlocked ? 'yellow' : 'red'}-700 text-white px-4 py-2 rounded-lg font-semibold">
        ${isCurrentlyBlocked ? 'Unblock' : 'Block'} ${nickname}
      </button>
      <button id="copyBtn" class="flex-grow bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold">Copy Secret</button>
      <button id="closeBtn" class="flex-grow bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold">Close</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector("#closeBtn").addEventListener("click", () => overlay.remove());
  modal.querySelector("#copyBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(content); toast("Copied!", "success"); } 
    catch { toast("Failed to copy", "error"); }
  });
  
  // ENGELLEME İŞLEMİ
  modal.querySelector("#blockBtn").addEventListener("click", () => {
    const newBlockedState = toggleBlock(recipientPublicKeyJwk, nickname);
    const blockBtn = modal.querySelector("#blockBtn");
    
    if (newBlockedState) {
        blockBtn.textContent = `Unblock ${nickname}`;
        blockBtn.classList.replace('bg-red-600', 'bg-yellow-600');
        blockBtn.classList.replace('hover:bg-red-700', 'hover:bg-yellow-700');
    } else {
        blockBtn.textContent = `Block ${nickname}`;
        blockBtn.classList.replace('bg-yellow-600', 'bg-red-600');
        blockBtn.classList.replace('hover:bg-yellow-700', 'hover:bg-red-700');
    }
  });


  // Cevaplama kısmı
  modal.querySelector("#replyBtn").addEventListener("click", async () => {
    const replyContent = modal.querySelector("#replyTextarea").value.trim();
    if (replyContent.length < 5) {
      toast("Reply must be at least 5 characters.", "error");
      return;
    }
    
    const replyBtn = modal.querySelector("#replyBtn");
    lock(replyBtn, true, "Encrypting... Generating keys...");
    
    try {
      const myReplyKeyPair = await generateE2EEKeyPair();
      const myNickname = generateNickname();
      
      const recipientReplyKeyJwk = JSON.parse(public_key_for_replies);
      
      const myPrivateKey = await importPrivateKey(myReplyKeyPair.privateKeyJwk);
      const sharedSecret = await deriveSharedSecret(myPrivateKey, recipientReplyKeyJwk);
      
      const { encrypted_content, iv } = await encryptChatMessage(replyContent, sharedSecret);
      
      const messagePayload = {
        secret_id: secret_id,
        sender_nickname: myNickname,
        sender_public_key: JSON.stringify(myReplyKeyPair.publicKeyJwk),
        encrypted_content: encrypted_content,
        iv: iv
      };
      
      const { data: insertedMsg, error: msgError } = await supabaseClient
        .from('messages')
        .insert(messagePayload)
        .select('id')
        .single();
        
      if (msgError) throw new Error("Message could not be sent: " + msgError.message);

      // CRITICAL FIX: Kendi mesajımızın net metnini localStorage'a kaydet (Inbox hatası fix'i)
      const currentSent = JSON.parse(localStorage.getItem('my_sent_messages_clear_text') || '{}');
      currentSent[insertedMsg.id] = replyContent;
      localStorage.setItem('my_sent_messages_clear_text', JSON.stringify(currentSent));
      
      toast("Encrypted reply sent!", "success");
      modal.querySelector("#replyTextarea").value = "";
      
    } catch(e) {
      toast("Error sending reply: " + e.message, "error"); 
    } finally {
      lock(replyBtn, false, "Send Reply (E2E Encrypted)");
    }
  });
}

// YENİ: "Latest Secrets" (Public) Feed'ini Yükler (Aynı Kalır)
async function loadLatestSecretsFeed() {
  feedLoading.classList.remove("hidden");
  feed.innerHTML = "";
  
  try {
    // 1. Sırları Çek (Popüler Sırlar listesi için Top 3 eklendi)
    const { data: popularSecrets, error: popularError } = await supabaseClient
        .from('vibe_counts')
        .select('secret_id, vibe_type, count')
        .order('count', { ascending: false })
        .limit(3);
    
    const popularIds = popularSecrets ? [...new Set(popularSecrets.map(v => v.secret_id))] : [];

    // Top 20 en son sırrı çek
    const { data: latestSecrets, error: latestError } = await supabaseClient
      .from('secrets')
      .select('id, nickname, content, public_key_for_replies')
      .eq('is_public', true) 
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (latestError) throw new Error(latestError.message);
    
    if (latestSecrets.length === 0) {
      feedLoading.textContent = "No public secrets yet. Be the first!";
      return;
    }
    
    // 2. Tüm Tepkileri VIEW'den çek
    const secretIds = latestSecrets.map(s => s.id);
    const { data: vibesData, error: vibesError } = await supabaseClient
      .from('vibe_counts') 
      .select('secret_id, vibe_type, count')
      .in('secret_id', secretIds);

    if (vibesError) console.warn("Could not load vibes:", vibesError.message);
    
    // 3. Tepkileri sır ID'sine göre grupla
    const vibesMap = {};
    if (vibesData) {
        vibesData.forEach(v => {
            if (!vibesMap[v.secret_id]) vibesMap[v.secret_id] = {};
            vibesMap[v.secret_id][v.vibe_type] = v.count;
        });
    }

    feedLoading.classList.add("hidden");
    
    // 4. Feed'i Oluştur
    latestSecrets.forEach(secret => {
      const currentVibes = vibesMap[secret.id] || {};
      const isPopular = popularIds.includes(secret.id);
      
      const div = document.createElement("div");
      div.className = "bg-gray-800 p-3 rounded-lg border-2" + (isPopular ? " border-yellow-500 shadow-lg" : " border-gray-800"); // Popülerlik görseli
      div.innerHTML = `
        <p class="text-sm text-white whitespace-pre-line break-words">
          ${isPopular ? '<span class="text-yellow-400 font-bold mr-1">🔥 HOT:</span>' : ''}
          ${secret.content.substring(0, 100)}...
        </p>
        <div class="flex justify-between items-center mt-2">
          <span class="text-xs text-cyan-400 font-semibold">${secret.nickname}</span>
          <div class="flex items-center gap-3">
              <div class="flex gap-2">
                ${renderVibeButton(secret.id, 'love', '❤️', currentVibes['love'] || 0)}
                ${renderVibeButton(secret.id, 'shock', '🤯', currentVibes['shock'] || 0)}
                ${renderVibeButton(secret.id, 'funny', '😂', currentVibes['funny'] || 0)}
              </div>
              <button data-secret-id="${secret.id}" data-nickname="${secret.nickname}" data-content="${encodeURIComponent(secret.content)}" data-public-key='${secret.public_key_for_replies}' class="reply-to-public-btn text-xs bg-cyan-600 hover:bg-cyan-700 text-white py-1 px-2 rounded">
                Reply
              </button>
          </div>
        </div>
      `;
      feed.appendChild(div);
    });
    
  } catch (e) {
    feedLoading.textContent = "Error loading feed.";
    toast("Error loading feed: " + e.message, "error");
  }
}

// YENİ: Tepki Butonu HTML'i (Aynı Kalır)
function renderVibeButton(secretId, vibeType, emoji, count) {
    return `
        <button 
            data-secret-id="${secretId}" 
            data-vibe-type="${vibeType}" 
            class="vibe-btn text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded-full transition duration-150 flex items-center gap-1"
            title="React with ${emoji}">
            ${emoji}<span class="vibe-count">${count}</span>
        </button>
    `;
}

// YENİ: Tepki Gönderme İşlemi (VIBE HATASI ÇÖZÜMÜ)
async function sendVibe(secretId, vibeType, button) {
    const db = getLocalDatabase();
    const countSpan = button.querySelector('.vibe-count');
    const initialCount = countSpan ? parseInt(countSpan.textContent) : 0;
    
    // VIBE DÜZELTMESİ: Butonu hemen kilitle
    lock(button, true, "..."); 
    
    const emojiMap = { 'love': '❤️', 'shock': '🤯', 'funny': '😂' };
    const emoji = emojiMap[vibeType] || '👍'; 

    try {
        const { error } = await supabaseClient
            .from('secret_vibes')
            .insert({
                secret_id: secretId,
                viewer_id: db.viewer_id, 
                vibe_type: vibeType
            });
            
        if (error) {
            if (error.code === '23505') { 
                 toast("You have already reacted to this secret.", "info");
                 button.disabled = true;
                 button.classList.add("opacity-50", "cursor-not-allowed");
                 return;
            }
            throw new Error(error.message);
        }
        
        // Başarılı olursa sayacı artır ve butonu kilitle
        if (countSpan) countSpan.textContent = initialCount + 1;
        
        toast(`Vibe ${emoji} sent!`, "success");
        button.disabled = true;
        button.classList.add("opacity-50", "cursor-not-allowed");
        
    } catch (e) {
        toast("Error sending vibe: " + e.message, "error");
    } finally {
        // Hata durumunda butonu aç ve eski sayısını göster
        if (!button.disabled) {
            lock(button, false, `${emoji}${countSpan ? countSpan.textContent : ''}`); 
        }
    }
}


// YENİ: "Get a Private Secret" (Aynı Kalır)
async function fetchPrivateSecret() {
  lock(fetchBtn, true, "Fetching...");
  const db = getLocalDatabase();
  
  try {
    const { data: seenData, error: seenError } = await supabaseClient
      .from('secret_views')
      .select('secret_id')
      .eq('viewer_id', db.viewer_id);
      
    if (seenError) throw new Error("Could not fetch viewed secrets: " + seenError.message);
    const seenIds = seenData.map(r => r.secret_id);
    
    const mySecretIds = db.my_secrets.map(s => s.secret_id);
    
    const { data, error } = await supabaseClient
      .from('secrets')
      .select('id, nickname, content, public_key_for_replies')
      .eq('is_public', false) 
      .not('id', 'in', `(${[...mySecretIds, ...seenIds].join(',') || 0})`) 
      .limit(50) 
      .range(0, 49);

    if (error) throw new Error("Fetch failed: " + error.message);

    const unseen = data.filter(item => !seenIds.includes(item.id) && !mySecretIds.includes(item.id));
    
    if (unseen.length > 0) {
      const randomSecret = unseen[Math.floor(Math.random() * unseen.length)];
      
      const { error: viewError } = await supabaseClient
        .from('secret_views')
        .insert({ secret_id: randomSecret.id, viewer_id: db.viewer_id });
        
      if (viewError) console.warn("Could not mark as seen:", viewError.message);

      showSecretModal(randomSecret, "private");
      
      // KRİTİK DEĞİŞİM: Sadece bu oturum için kilit koy
      sessionStorage.setItem("hasFetchedSecret", "true"); 
      updateBtnStates();
      
    } else {
      toast("No new private secrets found to fetch.", "error");
      lock(fetchBtn, false, "Get a Private Secret"); 
    }
    
  } catch (e) {
    toast("Error fetching private secret: " + e.message, "error");
    lock(fetchBtn, false, "Get a Private Secret");
  }
}

// YENİ: Modal (ENGELLEME EKLENDİ - Aynı Kalır)
function showSecretModal(secretObject, type = "public") {
  
  const { id: secret_id, nickname, content, public_key_for_replies } = secretObject;
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4";
  
  const modal = document.createElement("div");
  modal.className = "bg-gray-900 text-white max-w-lg w-full rounded-xl shadow-xl p-6 text-left";
  
  // Engelleme durumunu kontrol et
  const recipientPublicKeyJwk = JSON.parse(public_key_for_replies);
  const isCurrentlyBlocked = isBlocked(recipientPublicKeyJwk);
  
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
    <div class="flex justify-between items-center gap-4">
      <button id="blockBtn" class="flex-grow bg-${isCurrentlyBlocked ? 'yellow' : 'red'}-600 hover:bg-${isCurrentlyBlocked ? 'yellow' : 'red'}-700 text-white px-4 py-2 rounded-lg font-semibold">
        ${isCurrentlyBlocked ? 'Unblock' : 'Block'} ${nickname}
      </button>
      <button id="copyBtn" class="flex-grow bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold">Copy Secret</button>
      <button id="closeBtn" class="flex-grow bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold">Close</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector("#closeBtn").addEventListener("click", () => overlay.remove());
  modal.querySelector("#copyBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(content); toast("Copied!", "success"); } 
    catch { toast("Failed to copy", "error"); }
  });
  
  // ENGELLEME İŞLEMİ
  modal.querySelector("#blockBtn").addEventListener("click", () => {
    const newBlockedState = toggleBlock(recipientPublicKeyJwk, nickname);
    const blockBtn = modal.querySelector("#blockBtn");
    
    if (newBlockedState) {
        blockBtn.textContent = `Unblock ${nickname}`;
        blockBtn.classList.replace('bg-red-600', 'bg-yellow-600');
        blockBtn.classList.replace('hover:bg-red-700', 'hover:bg-yellow-700');
    } else {
        blockBtn.textContent = `Block ${nickname}`;
        blockBtn.classList.replace('bg-yellow-600', 'bg-red-600');
        blockBtn.classList.replace('hover:bg-yellow-700', 'hover:bg-red-700');
    }
  });


  // Cevaplama kısmı
  modal.querySelector("#replyBtn").addEventListener("click", async () => {
    const replyContent = modal.querySelector("#replyTextarea").value.trim();
    if (replyContent.length < 5) {
      toast("Reply must be at least 5 characters.", "error");
      return;
    }
    
    const replyBtn = modal.querySelector("#replyBtn");
    lock(replyBtn, true, "Encrypting... Generating keys...");
    
    try {
      const myReplyKeyPair = await generateE2EEKeyPair();
      const myNickname = generateNickname();
      
      const recipientReplyKeyJwk = JSON.parse(public_key_for_replies);
      
      const myPrivateKey = await importPrivateKey(myReplyKeyPair.privateKeyJwk);
      const sharedSecret = await deriveSharedSecret(myPrivateKey, recipientReplyKeyJwk);
      
      const { encrypted_content, iv } = await encryptChatMessage(replyContent, sharedSecret);
      
      const messagePayload = {
        secret_id: secret_id,
        sender_nickname: myNickname,
        sender_public_key: JSON.stringify(myReplyKeyPair.publicKeyJwk),
        encrypted_content: encrypted_content,
        iv: iv
      };
      
      const { data: insertedMsg, error: msgError } = await supabaseClient
        .from('messages')
        .insert(messagePayload)
        .select('id')
        .single();
        
      if (msgError) throw new Error("Message could not be sent: " + msgError.message);

      // CRITICAL FIX: Kendi mesajımızın net metnini localStorage'a kaydet (Inbox hatası fix'i)
      const currentSent = JSON.parse(localStorage.getItem('my_sent_messages_clear_text') || '{}');
      currentSent[insertedMsg.id] = replyContent;
      localStorage.setItem('my_sent_messages_clear_text', JSON.stringify(currentSent));
      
      toast("Encrypted reply sent!", "success");
      modal.querySelector("#replyTextarea").value = "";
      
    } catch(e) {
      toast("Error sending reply: " + e.message, "error"); 
    } finally {
      lock(replyBtn, false, "Send Reply (E2E Encrypted)");
    }
  });
}

// YENİ: "Inbox" (ENGELLEME VE KENDİ/KARŞI TARAF MESAJ AYRIMI İLE ÇÖZÜM)
async function showInboxModal() {
  const db = getLocalDatabase();
  
  if (db.my_secrets.length === 0) {
    toast("You have not submitted any secrets yet. No inbox found.", "error");
    return;
  }
  
  const overlay = document.createElement("div");
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
    const mySecretIds = db.my_secrets.map(s => s.secret_id);
    if (mySecretIds.length === 0) {
      loadingEl.textContent = "No secrets found.";
      return;
    }
    
    const { data: messages, error } = await supabaseClient
      .rpc('get_my_messages_by_secret_ids', { secret_ids: mySecretIds });
      
    if (error) throw new Error("Could not fetch messages: " + error.message);
    
    loadingEl.style.display = 'none';
    if (messages.length === 0) {
      convoListEl.innerHTML = `<p class="text-gray-400 p-2 text-center">No replies yet.</p>`;
      return;
    }
    
    const conversations = {};
    const myPublicKeys = db.my_secrets.map(s => JSON.stringify(s.public_key_for_replies));

    // 1. Gruplama: Mesajları secret_id ve partner key'e göre grupla
    for (const msg of messages) {
        
        const targetSecret = db.my_secrets.find(s => s.secret_id === msg.secret_id);
        if (!targetSecret) continue; 
        
        const isMyMessage = myPublicKeys.includes(msg.sender_public_key);
        
        let partnerKey;
        let partnerNickname;

        if (isMyMessage) {
            // Eğer mesaj benden gittiyse, partner key'i o thread'deki diğer (karşı) anahtar olmalıdır.
            // Bu zor olduğu için, geçici olarak partner key'ini msg.sender_public_key'den alıyoruz.
            // Bu, daha sonra aşağıdaki konsolidasyon adımında çözülecektir.
            partnerKey = 'PENDING_RESOLVE_' + msg.secret_id; 
            partnerNickname = targetSecret.nickname; // Benim nickim
        } else {
            // Mesaj karşıdan gelmişse, bu anahtar partnerin anahtarıdır.
            partnerKey = msg.sender_public_key;
            partnerNickname = msg.sender_nickname;
        }
        
        const convoId = `${msg.secret_id}:${partnerKey}`; 
        
        // Engelleme Kontrolü (Sadece gelen mesajlar için kontrol)
        if (!isMyMessage) {
            if (isBlocked(JSON.parse(partnerKey))) {
                continue; 
            }
        }
        
        if (!conversations[convoId]) {
            conversations[convoId] = {
                secret_id: msg.secret_id,
                partner_nickname: partnerNickname, 
                partner_public_key: partnerKey,
                messages: []
            };
        }
        conversations[convoId].messages.push(msg);
    }
    
    const uniqueConversations = {};
    
    // 2. Konsolidasyon ve Partner Key Çözümlemesi
    for(const key in conversations) {
        const convo = conversations[key];
        let finalPartnerKey = convo.partner_public_key;
        let finalPartnerNickname = convo.partner_nickname;

        if (finalPartnerKey.startsWith('PENDING_RESOLVE_')) {
            // Kendi mesajlarımızı içeren bir grupsa, partner key'i bulmalıyız.
            const actualPartnerMsg = convo.messages.find(m => !myPublicKeys.includes(m.sender_public_key));
            if (actualPartnerMsg) {
                finalPartnerKey = actualPartnerMsg.sender_public_key;
                finalPartnerNickname = actualPartnerMsg.sender_nickname;
            } else {
                // Konuşmada sadece giden mesaj varsa (cevap gelmemişse)
                finalPartnerKey = 'NO_PARTNER'; 
                finalPartnerNickname = '[No Replies Yet]';
            }
        }
        
        const finalConvoKey = `${convo.secret_id}:${finalPartnerKey}`;
        
        if (!uniqueConversations[finalConvoKey]) {
            uniqueConversations[finalConvoKey] = convo;
            uniqueConversations[finalConvoKey].partner_public_key = finalPartnerKey;
            uniqueConversations[finalConvoKey].partner_nickname = finalPartnerNickname; // Nickname'i güncelle
        } else {
            uniqueConversations[finalConvoKey].messages.push(...convo.messages);
        }
    }


    // 3. Konuşma Listesini Gösterme
    for (const convoKey in uniqueConversations) {
        const convo = uniqueConversations[convoKey];
        if (convo.partner_public_key === 'NO_PARTNER') continue; // Cevap gelmeyenleri gösterme
        
        convo.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        const partnerPublicKeyJwk = JSON.parse(convo.partner_public_key);
        const isCurrentlyBlocked = isBlocked(partnerPublicKeyJwk);
        
        // Hata Düzeltmesi: Her zaman partner nickname'i göster.
        let displayNickname = isCurrentlyBlocked ? "[BLOCKED USER]" : convo.partner_nickname;
        
        const div = document.createElement("div");
        div.className = "p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-700";
        div.innerHTML = `
            <div class="font-semibold text-white">${displayNickname}</div>
            <div class="text-xs text-gray-400">${convo.messages.length} message(s)</div>
        `;
        
        div.addEventListener("click", async () => {
            Array.from(convoListEl.children).forEach(child => child.classList.remove('bg-cyan-900'));
            div.classList.add('bg-cyan-900');
            await loadConversation(modal, convo);
        });
        convoListEl.appendChild(div);
    }
    
    checkNotifications(messages, db);

  } catch (e) {
    loadingEl.textContent = "Error loading inbox: " + e.message;
  }
}

// YENİ: Seçilen Sohbeti Yükler (ENGELLEME BUTONU VE NİCK DÜZELTMESİ EKLENDİ)
async function loadConversation(modal, convo) {
  const messageFeed = modal.querySelector("#message-feed");
  const replyArea = modal.querySelector("#inbox-reply-area");
  const replyBtn = modal.querySelector("#inboxReplyBtn");
  const replyText = modal.querySelector("#inboxReplyText");
  const messagePanel = modal.querySelector("#inbox-message-panel");
  
  messageFeed.innerHTML = `<p class="text-gray-400">Decrypting messages from ${convo.partner_nickname}...</p>`;
  
  try {
    const db = getLocalDatabase();
    const mySecret = db.my_secrets.find(s => s.secret_id === convo.secret_id);
    if (!mySecret) throw new Error("Local private key for this secret not found!");
    
    const myReplyKeyString = JSON.stringify(mySecret.public_key_for_replies);
    
    // Partner Key ve Engelleme Durumu
    const partnerKeyString = convo.partner_public_key;
    const partnerPublicKeyJwk = JSON.parse(partnerKeyString);
    const isCurrentlyBlocked = isBlocked(partnerPublicKeyJwk);

    // Paylaşımlı gizli anahtarı türet
    const myReplyPrivateKey = await importPrivateKey(mySecret.private_key_for_replies);
    const sharedSecret = await deriveSharedSecret(myReplyPrivateKey, partnerPublicKeyJwk);
    
    
    messageFeed.innerHTML = ""; 
    convo.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Kendi gönderdiğimiz mesajların clear-text halini local'den çek
    const mySentMessagesClearText = JSON.parse(localStorage.getItem('my_sent_messages_clear_text') || '{}');

    for (const msg of convo.messages) {
      
      const isMyMessage = msg.sender_public_key === myReplyKeyString;
      
      let decryptedText = "[Cannot decrypt]"; 
      
      if (isMyMessage) {
          decryptedText = mySentMessagesClearText[msg.id] || "[Clear text not found in local storage]"; 
      } else {
          decryptedText = await decryptChatMessage(msg.encrypted_content, msg.iv, sharedSecret);
      }
      
      // Engellenmişse gelen mesajları maskele
      if (!isMyMessage && isCurrentlyBlocked) {
          decryptedText = "[BLOCKED MESSAGE]";
      }
      
      
      const msgDiv = document.createElement("div");
      
      // Kendi mesajımızsa sağa yasla, farklı renk ver
      if (isMyMessage) {
        msgDiv.className = "flex justify-end";
        msgDiv.innerHTML = `
          <div class="max-w-xs p-3 bg-cyan-900 rounded-lg shadow-md">
            <p class="text-xs text-gray-300 text-right">Me (${mySecret.nickname}) (${new Date(msg.created_at).toLocaleTimeString()})</p>
            <p class="text-white whitespace-pre-line break-words text-right">${decryptedText}</p>
          </div>
        `;
      } else {
        // Karşı tarafın mesajıysa sola yasla
        msgDiv.className = "flex justify-start";
        msgDiv.innerHTML = `
          <div class="max-w-xs p-3 bg-gray-700 rounded-lg shadow-md">
            <p class="text-xs text-cyan-400">${convo.partner_nickname} (${new Date(msg.created_at).toLocaleTimeString()})</p>
            <p class="text-white whitespace-pre-line break-words">${decryptedText}</p>
          </div>
        `;
      }

      messageFeed.appendChild(msgDiv);
    }
    messageFeed.scrollTop = messageFeed.scrollHeight; 

    // ENGELLEME BUTONUNU MESAJ PANELİNE EKLE
    const blockButtonArea = document.createElement("div");
    blockButtonArea.className = "flex justify-end mt-2";
    blockButtonArea.innerHTML = `
        <button id="inboxBlockBtn" class="text-xs bg-${isCurrentlyBlocked ? 'yellow' : 'red'}-600 hover:bg-${isCurrentlyBlocked ? 'yellow' : 'red'}-700 text-white px-3 py-1 rounded-lg font-semibold">
            ${isCurrentlyBlocked ? `Unblock ${convo.partner_nickname}` : `Block ${convo.partner_nickname}`}
        </button>
    `;
    const existingBlockArea = messagePanel.querySelector('#inboxBlockBtnContainer');
    if (existingBlockArea) existingBlockArea.remove();

    blockButtonArea.id = 'inboxBlockBtnContainer';
    messagePanel.insertBefore(blockButtonArea, replyArea);


    // Engelleme butonu listener'ı
    messagePanel.querySelector("#inboxBlockBtn").addEventListener("click", () => {
        const newBlockedState = toggleBlock(partnerPublicKeyJwk, convo.partner_nickname);
        const btn = messagePanel.querySelector("#inboxBlockBtn");
        
        // Engelleme durumunu güncelle
        if (newBlockedState) {
            btn.textContent = `Unblock ${convo.partner_nickname}`;
            btn.classList.replace('bg-red-600', 'bg-yellow-600');
            btn.classList.replace('hover:bg-red-700', 'hover:bg-yellow-700');
        } else {
            btn.textContent = `Block ${convo.partner_nickname}`;
            btn.classList.replace('bg-yellow-600', 'bg-red-600');
            btn.classList.replace('hover:bg-yellow-700', 'hover:bg-red-700');
        }
        
        // Konuşmayı yenile (mesaj maskelerini güncellemek için)
        // Yeni engelleme durumunu yansıtmak için konuşmayı yeniden yükle
        loadConversation(modal, { ...convo, partner_public_key: partnerKeyString }); 
    });
    
    replyArea.classList.remove("hidden");
    replyText.value = "";
    
    // Cevap Gönderme (Aynı Kalır)
    replyBtn.onclick = async () => {
      const replyContent = replyText.value.trim();
      if (replyContent.length < 2) {
        toast("Reply must be at least 2 characters.", "error");
        return;
      }
      
      lock(replyBtn, true, "Sending...");
      
      try {
        const { encrypted_content, iv } = await encryptChatMessage(replyContent, sharedSecret);

        const messagePayload = {
          secret_id: convo.secret_id, 
          sender_nickname: mySecret.nickname, 
          sender_public_key: myReplyKeyString, 
          encrypted_content: encrypted_content,
          iv: iv
        };
        
        const { data: insertedMsg, error: msgError } = await supabaseClient
          .from('messages')
          .insert(messagePayload)
          .select('id')
          .single();
          
        if (msgError) throw new Error("Reply could not be sent: " + msgError.message);
        
        const currentSent = JSON.parse(localStorage.getItem('my_sent_messages_clear_text') || '{}');
        currentSent[insertedMsg.id] = replyContent;
        localStorage.setItem('my_sent_messages_clear_text', JSON.stringify(currentSent));

        const msgDiv = document.createElement("div");
        msgDiv.className = "flex justify-end";
        msgDiv.innerHTML = `
          <div class="max-w-xs p-3 bg-cyan-900 rounded-lg shadow-md">
            <p class="text-xs text-gray-300 text-right">Me (${mySecret.nickname}) (now)</p>
            <p class="text-white whitespace-pre-line break-words text-right">${replyContent}</p>
          </div>
        `;
        messageFeed.appendChild(msgDiv);
        messageFeed.scrollTop = messageFeed.scrollHeight; 
        
        replyText.value = "";
        
      } catch (e) {
        toast("Error sending reply: " + e.message, "error");
      } finally {
        lock(replyBtn, false, "Send");
      }
    };
    
  } catch(e) {
    messageFeed.innerHTML = `<p class="text-red-400">Error decrypting conversation: ${e.message}</p>`;
  }
}

// YENİ: Bildirimleri Kontrol Et (Aynı Kalır)
function checkNotifications(allMessages, db) {
  const lastCheck = new Date(db.last_inbox_check);
  let hasNewMessage = false;
  
  const myPublicKeys = db.my_secrets.map(s => JSON.stringify(s.public_key_for_replies));
  
  for (const msg of allMessages) {
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
  
  db.last_inbox_check = new Date().toISOString();
  saveLocalDatabase(db);
}

// YENİ: Yedekleme ve Geri Yükleme (Aynı Kalır)
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
    
    const dbString = JSON.stringify(db);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      new TextEncoder().encode(dbString)
    );
    
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
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        data
      );
      
      const dbString = new TextDecoder().decode(decryptedData);
      JSON.parse(dbString);
      
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

// YENİ: Yedekleme Butonunu Ayarla (Aynı Kalır)
backupBtn.addEventListener("click", () => {
  if (confirm("Backup: Download an encrypted file of your keys.\nRestore: Use a backup file.\n\nDo you want to BACKUP (OK) or RESTORE (Cancel)?")) {
    backupKeys();
  } else {
    restoreKeys();
  }
});


// YENİ: Buton Durumlarını Güncelle (Aynı Kalır)
function updateBtnStates() {
  // session storage'dan oku (Tarayıcı kapanınca sıfırlanır)
  const hasFetched = sessionStorage.getItem("hasFetchedSecret") === "true"; 

  lock(sendBtn, false, "Submit Secret"); 
  
  if (hasFetched) {
    // Eğer bu oturumda zaten bir sır çekildi ise kilitlenir
    lock(fetchBtn, true, "Fetched for this session"); 
  } else {
    // Aksi takdirde, çekme butonu her zaman açıktır
    lock(fetchBtn, false, "Get a Private Secret"); 
  }
}

// YENİ: Feed'deki "Reply" butonlarına tıklama (Aynı Kalır)
document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("reply-to-public-btn")) {
    const secret = {
      id: e.target.dataset.secretId,
      nickname: e.target.dataset.nickname,
      content: decodeURIComponent(e.target.dataset.content), 
      public_key_for_replies: e.target.dataset.publicKey
    };
    showSecretModal(secret, "public");
  }
});

// YENİ: Tepki Butonlarına Tıklama (Aynı Kalır)
document.body.addEventListener("click", (e) => {
  const vibeBtn = e.target.closest('.vibe-btn');
  if (vibeBtn) {
    const secretId = vibeBtn.dataset.secretId;
    const vibeType = vibeBtn.dataset.vibeType;
    sendVibe(secretId, vibeType, vibeBtn);
  }
});


// ========== SAYFA YÜKLENİNCE (Aynı Kalır) ==========
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
