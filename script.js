// ========== CONFIG ==========
const SUPABASE_URL = "https://rupebvabajtqnwpwytjf.supabase.co";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGVidmFiYWp0cW53cHd5dGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NDU1MTAsImV4cCI6MjA2ODAyMTUxMH0.jcPhEvr83w1CJYmyen6k354U2riN3-76WcOmppFsbvg";

// Initialize Supabase client with error handling
let supabaseClient = null;

function initSupabase() {
  try {
    if (typeof supabase === 'undefined') {
      console.error("Supabase library not loaded!");
      return null;
    }
    
    // Validate URL and API key
    if (!SUPABASE_URL || !API_KEY) {
      console.error("❌ Supabase URL or API key is missing!");
      return null;
    }
    
    // Create Supabase client with proper configuration
    supabaseClient = supabase.createClient(SUPABASE_URL, API_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'apikey': API_KEY,
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    
    console.log("✅ Supabase client initialized with URL:", SUPABASE_URL);
    return supabaseClient;
  } catch (error) {
    console.error("❌ Error initializing Supabase client:", error);
    return null;
  }
}

// Initialize immediately if supabase is available, otherwise wait
if (typeof supabase !== 'undefined') {
  supabaseClient = initSupabase();
} else {
  // Wait for supabase to load
  window.addEventListener('load', () => {
    if (typeof supabase !== 'undefined') {
      supabaseClient = initSupabase();
    } else {
      console.error("Supabase library failed to load. Check the script tag in index.html");
    }
  });
}

// ========== DOM ELEMENTS ==========
const sendBtn = document.getElementById("sendBtn");
const fetchBtn = document.getElementById("fetchBtn");
const inboxBtn = document.getElementById("inboxBtn");
const sendMsg = document.getElementById("sendMsg");

// ========== RSA-OAEP ENCRYPTION FUNCTIONS ==========
// RSA-OAEP 4096-bit with SHA-256

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Import RSA public key from JWK format
 */
async function importPublicKey(keyJwk) {
  return await crypto.subtle.importKey(
    "jwk",
    keyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["encrypt"]
  );
}

/**
 * Import RSA private key from JWK format
 */
async function importPrivateKey(keyJwk) {
  return await crypto.subtle.importKey(
    "jwk",
    keyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["decrypt"]
  );
}

/**
 * Encrypt message using RSA-OAEP
 * Note: RSA-OAEP can only encrypt small amounts of data (max ~446 bytes for 4096-bit key)
 * For larger messages, we'll need to use hybrid encryption (RSA + AES)
 */
async function encryptMessageRSA(message, publicKeyJwk) {
  try {
    const publicKey = await importPublicKey(publicKeyJwk);
    const encodedMessage = new TextEncoder().encode(message);
    
    // RSA-OAEP can handle up to ~446 bytes for 4096-bit keys
    // For longer messages, we need to split or use hybrid encryption
    const maxChunkSize = 446; // Safe size for RSA-OAEP 4096
    
    if (encodedMessage.length <= maxChunkSize) {
      // Small message - encrypt directly
      const encrypted = await crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        publicKey,
        encodedMessage
      );
      return arrayBufferToBase64(encrypted);
    } else {
      // Large message - use hybrid encryption (RSA + AES)
      // Generate a random AES key
      const aesKey = await crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256
        },
        true,
        ["encrypt", "decrypt"]
      );
      
      // Encrypt the message with AES
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        aesKey,
        encodedMessage
      );
      
      // Export and encrypt the AES key with RSA
      const exportedKey = await crypto.subtle.exportKey("raw", aesKey);
      const encryptedKey = await crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        publicKey,
        exportedKey
      );
      
      // Return combined encrypted data
      return JSON.stringify({
        type: "hybrid",
        encryptedKey: arrayBufferToBase64(encryptedKey),
        encryptedData: arrayBufferToBase64(encryptedData),
        iv: arrayBufferToBase64(iv)
      });
    }
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt message: " + error.message);
  }
}

/**
 * Decrypt message using RSA-OAEP
 */
async function decryptMessageRSA(encryptedBase64, privateKeyJwk) {
  try {
    const privateKey = await importPrivateKey(privateKeyJwk);
    const encryptedData = base64ToArrayBuffer(encryptedBase64);
    
    // Check if it's hybrid encryption
    try {
      const parsed = JSON.parse(new TextDecoder().decode(base64ToArrayBuffer(encryptedBase64)));
      if (parsed.type === "hybrid") {
        // Decrypt the AES key
        const encryptedKey = base64ToArrayBuffer(parsed.encryptedKey);
        const decryptedKeyBuffer = await crypto.subtle.decrypt(
          {
            name: "RSA-OAEP"
          },
          privateKey,
          encryptedKey
        );
        
        // Import the AES key
        const aesKey = await crypto.subtle.importKey(
          "raw",
          decryptedKeyBuffer,
          {
            name: "AES-GCM"
          },
          true,
          ["decrypt"]
        );
        
        // Decrypt the message
        const iv = base64ToArrayBuffer(parsed.iv);
        const encryptedMessage = base64ToArrayBuffer(parsed.encryptedData);
        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: iv
          },
          aesKey,
          encryptedMessage
        );
        
        return new TextDecoder().decode(decryptedBuffer);
      }
    } catch (e) {
      // Not hybrid, continue with direct RSA decryption
    }
    
    // Direct RSA decryption
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      encryptedData
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption error:", error);
    return "[Could not decrypt this message]";
  }
}

// ========== IDENTITY MANAGEMENT ==========

/**
 * Generate or retrieve user identity with RSA keypair
 */
async function getOrInitializeIdentity() {
  let clientId = localStorage.getItem("clientId");
  let privateKeyJwk = null;
  let publicKeyJwk = null;
  
  try {
    privateKeyJwk = JSON.parse(localStorage.getItem("privateKey"));
    publicKeyJwk = JSON.parse(localStorage.getItem("publicKey"));
  } catch (e) {
    console.error("Error parsing stored keys:", e);
  }

  if (!clientId || !privateKeyJwk || !publicKeyJwk) {
    console.log("Creating new anonymous identity with RSA-OAEP 4096 keys...");
    
    // Generate client ID
    clientId = crypto.randomUUID();
    
    // Generate RSA-OAEP 4096-bit keypair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );
    
    // Export keys to JWK format
    privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    
    // Store in localStorage
    localStorage.setItem("clientId", clientId);
    localStorage.setItem("privateKey", JSON.stringify(privateKeyJwk));
    localStorage.setItem("publicKey", JSON.stringify(publicKeyJwk));

    // Register profile in Supabase (if client is available)
    try {
      // Ensure Supabase client is initialized
      if (!supabaseClient) {
        supabaseClient = initSupabase();
      }
      
      if (supabaseClient) {
        const { error } = await supabaseClient
          .from('profiles')
          .insert({
            client_id: clientId,
            public_key: JSON.stringify(publicKeyJwk)
          });

        if (error) {
          // If profile already exists, that's okay
          if (error.code !== '23505') { // Unique violation
            console.warn("Profile registration warning:", error.message);
            // Don't fail - profile will be created when needed
          } else {
            console.log("Profile already exists in Supabase.");
          }
        } else {
          console.log("New anonymous profile saved to Supabase.");
        }
      } else {
        console.warn("Supabase client not available, profile will be created later");
      }
    } catch (e) {
      console.warn("Profile could not be saved to Supabase:", e);
      // Don't fail - profile will be created when needed
    }
  }
  
  return {
    clientId: clientId,
    privateKeyJwk: privateKeyJwk,
    publicKeyJwk: publicKeyJwk
  };
}

// ========== UI HELPER FUNCTIONS ==========

function lock(btn, state = true) {
  if (!btn) return;
  btn.disabled = state;
  btn.classList.toggle("opacity-50", state);
  btn.classList.toggle("cursor-not-allowed", state);
}

function toast(msg, type = "info") {
  const div = document.createElement("div");
  div.innerHTML = msg.replace(/\n/g, "<br>");
  div.className =
    "fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg text-sm text-white z-50 max-w-md text-center " +
    (type === "error" ? "bg-red-600" : type === "success" ? "bg-green-600" : "bg-gray-700");
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

function updateBtnStates() {
  const hasSent = localStorage.getItem("hasSentSecret") === "true";
  const hasFetched = localStorage.getItem("hasFetchedSecret") === "true";
  
  if (hasFetched) {
    lock(fetchBtn, true);
    lock(sendBtn, true);
    return;
  }
  
  if (hasSent) {
    lock(sendBtn, true);
    lock(fetchBtn, false);
  } else {
    lock(sendBtn, false);
    lock(fetchBtn, true);
  }
}

// ========== SECRET MODAL WITH REPLY FUNCTIONALITY ==========

async function showSecretModal(secretObject) {
  const { id: secretId, content, client_id: senderClientId } = secretObject;
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4";
  
  const modal = document.createElement("div");
  modal.className = "bg-gray-900 text-white max-w-lg w-full rounded-xl shadow-xl p-6 text-left max-h-[90vh] overflow-y-auto";
  
  modal.innerHTML = `
    <p class="text-sm text-red-400 mb-4 text-center">
      ⚠️ You can only see this secret once. It will be gone when you close this.
    </p>
    <p class="text-lg font-mono mb-6 whitespace-pre-line break-words bg-gray-800 p-4 rounded">${escapeHtml(content)}</p>
    <h4 class="font-semibold text-lg mb-2 text-cyan-300">Anonymous Reply</h4>
    <textarea id="replyTextarea" rows="4" class="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500" placeholder="Write an encrypted reply... or paste a GIF/Image URL!"></textarea>
    <p class="text-xs text-gray-400 mt-1 mb-3">You can send text or image/GIF URLs. All replies are end-to-end encrypted.</p>
    <button id="replyBtn" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded transition duration-300 w-full">
      Send Reply (E2E Encrypted)
    </button>
    <hr class="border-gray-700 my-4">
    <div class="flex justify-center gap-4">
      <button id="copyBtn" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold">Copy Secret</button>
      <button id="closeBtn" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold">Close</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const replyBtn = modal.querySelector("#replyBtn");
  const replyTextarea = modal.querySelector("#replyTextarea");
  const closeBtn = modal.querySelector("#closeBtn");
  const copyBtn = modal.querySelector("#copyBtn");
  
  // Close modal
  closeBtn.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  // Copy secret
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast("Copied to clipboard!", "success");
    } catch {
      toast("Failed to copy", "error");
    }
  });

  // Send reply
  replyBtn.addEventListener("click", async () => {
    const replyContent = replyTextarea.value.trim();
    
    if (replyContent.length < 5) {
      toast("Reply must be at least 5 characters.", "error");
      return;
    }
    
    lock(replyBtn, true);
    replyBtn.textContent = "Encrypting and Sending...";
    
    try {
      const identity = await getOrInitializeIdentity();
      if (!identity) {
        throw new Error("Your identity could not be loaded.");
      }

      // Get recipient's public key
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('public_key')
        .eq('client_id', senderClientId)
        .single();

      if (profileError || !profileData) {
        throw new Error("Recipient's encryption key not found.");
      }

      const recipientPublicKeyJwk = JSON.parse(profileData.public_key);
      
      // Encrypt the reply
      const ciphertext = await encryptMessageRSA(replyContent, recipientPublicKeyJwk);
      
      // Determine if it's an image/GIF URL
      const isImageUrl = /\.(gif|jpe?g|png|webp)$/i.test(replyContent) || 
                         /^(https?:\/\/.*\.(gif|jpe?g|png|webp))/i.test(replyContent);
      
      // Prepare metadata
      const metadata = {
        isImage: isImageUrl,
        contentType: isImageUrl ? "image" : "text"
      };
      
      // Save reply to database
      const { error: replyError } = await supabaseClient
        .from('replies')
        .insert({
          secret_id: secretId,
          sender_client_id: identity.clientId,
          recipient_client_id: senderClientId,
          ciphertext: ciphertext,
          metadata: metadata
        });

      if (replyError) {
        throw new Error("Reply could not be sent: " + replyError.message);
      }

      toast("✅ Encrypted reply sent!", "success");
      replyTextarea.value = "";
      
      // Optionally close modal after a delay
      setTimeout(() => {
        overlay.remove();
      }, 1500);
      
    } catch (e) {
      console.error("Error sending reply:", e);
      toast("Error sending reply: " + e.message, "error");
    } finally {
      lock(replyBtn, false);
      replyBtn.textContent = "Send Reply (E2E Encrypted)";
    }
  });
}

// ========== INBOX FUNCTIONALITY ==========

async function showInboxModal() {
  const identity = await getOrInitializeIdentity();
  if (!identity) {
    toast("Could not load identity for inbox.", "error");
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  const modal = document.createElement("div");
  modal.className = "bg-gray-900 text-white max-w-2xl w-full rounded-xl shadow-xl p-6 h-[80vh] flex flex-col";
  
  modal.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-2xl font-bold text-cyan-300">Anonymous Inbox</h3>
      <button id="inbox-close" class="text-gray-400 hover:text-white text-2xl">&times;</button>
    </div>
    <p class="text-sm text-gray-400 mb-4">Only you can decrypt and see these messages. They are end-to-end encrypted.</p>
    <div id="inbox-loading" class="text-center p-4">Loading encrypted messages...</div>
    <div id="inbox-content" class="space-y-4 overflow-y-auto flex-1 p-1"></div>
    <button id="inbox-refresh" class="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-semibold">Refresh</button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const contentEl = modal.querySelector("#inbox-content");
  const loadingEl = modal.querySelector("#inbox-loading");
  const closeBtn = modal.querySelector("#inbox-close");
  const refreshBtn = modal.querySelector("#inbox-refresh");

  closeBtn.addEventListener("click", () => overlay.remove());

  // Load inbox function
  const loadInbox = async () => {
    loadingEl.style.display = 'block';
    contentEl.innerHTML = '';

    try {
      // Get all replies for this user
      const { data: replies, error } = await supabaseClient
        .from('replies')
        .select('*')
        .eq('recipient_client_id', identity.clientId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error("Could not fetch replies: " + error.message);
      }

      loadingEl.style.display = 'none';

      if (!replies || replies.length === 0) {
        contentEl.innerHTML = '<p class="text-center text-gray-400 py-8">Your inbox is empty. No replies yet.</p>';
        return;
      }

      // Decrypt and display each reply
      for (const reply of replies) {
        try {
          // Decrypt the reply
          const decryptedText = await decryptMessageRSA(reply.ciphertext, identity.privateKeyJwk);
          
          // Get metadata
          const metadata = reply.metadata || {};
          const isImage = metadata.isImage || false;
          
          // Create reply card
          const replyDiv = document.createElement("div");
          replyDiv.className = "bg-gray-800 p-4 rounded-lg border border-gray-700";
          
          const date = new Date(reply.created_at);
          const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString();
          
          let contentHTML = '';
          if (isImage && /^(https?:\/\/)/i.test(decryptedText)) {
            contentHTML = `
              <img src="${escapeHtml(decryptedText)}" 
                   class="max-w-full rounded-md mt-2" 
                   alt="Received Image"
                   onerror="this.parentElement.innerHTML='<p class=\\'text-red-400\\'>Failed to load image</p>'">
            `;
          } else {
            contentHTML = `<p class="text-white whitespace-pre-line break-words mt-2">${escapeHtml(decryptedText)}</p>`;
          }
          
          replyDiv.innerHTML = `
            <div class="flex justify-between items-start mb-2">
              <p class="text-xs text-gray-400">From: Anonymous</p>
              <p class="text-xs text-gray-400">${dateStr}</p>
            </div>
            ${contentHTML}
            <p class="text-xs text-gray-500 mt-2">Reply to Secret ID: ${reply.secret_id.substring(0, 8)}...</p>
          `;
          
          contentEl.appendChild(replyDiv);
        } catch (e) {
          console.error("Error decrypting reply:", e);
          const errorDiv = document.createElement("div");
          errorDiv.className = "bg-red-900 bg-opacity-50 p-4 rounded-lg border border-red-700";
          errorDiv.innerHTML = `<p class="text-red-400">Could not decrypt this message.</p>`;
          contentEl.appendChild(errorDiv);
        }
      }
    } catch (e) {
      loadingEl.style.display = 'none';
      contentEl.innerHTML = `<p class="text-center text-red-400 py-4">Error loading inbox: ${e.message}</p>`;
    }
  };

  // Load inbox on open
  await loadInbox();

  // Refresh button
  refreshBtn.addEventListener("click", loadInbox);
}

// ========== MAIN FUNCTIONS ==========

// ========== SUPABASE CONNECTION TEST ==========
async function testSupabaseConnection() {
  // Check if Supabase client is initialized
  if (!supabaseClient) {
    console.error("Supabase client not initialized");
    // Try to initialize
    supabaseClient = initSupabase();
    if (!supabaseClient) {
      return {
        success: false,
        error: "Supabase client not initialized. Check if Supabase library is loaded.",
        type: "InitializationError"
      };
    }
  }

  try {
    // First, test with a simple REST API call to verify CORS
    console.log("Testing Supabase connection...");
    console.log("URL:", SUPABASE_URL);
    
    // Test connection by trying to read from profiles table
    // Use a simple query that won't fail even if table is empty
    const { data, error, status, statusText } = await supabaseClient
      .from('profiles')
      .select('client_id')
      .limit(1);
    
    console.log("Connection test response:", { 
      hasData: !!data, 
      dataLength: data?.length || 0,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      } : null,
      status: status,
      statusText: statusText
    });
    
    if (error) {
      console.error("Supabase connection test failed:", error);
      
      // Provide specific error messages based on error code
      let errorMsg = error.message || "Unknown error";
      let detailedHelp = "";
      
      if (error.code === "PGRST116") {
        errorMsg = "Table 'profiles' does not exist.";
        detailedHelp = "Please run supabase-schema.sql in Supabase SQL Editor.";
      } else if (error.code === "PGRST301" || error.message?.includes("CORS")) {
        errorMsg = "CORS error detected.";
        detailedHelp = "Go to Supabase Dashboard > Settings > API > CORS and add your domain:\n" + window.location.origin;
      } else if (error.message?.includes("fetch") || error.message?.includes("NetworkError") || error.message?.includes("Failed to fetch")) {
        errorMsg = "Network/CORS error.";
        detailedHelp = "Possible causes:\n1. CORS not configured in Supabase\n2. Wrong Supabase URL\n3. Network connection issue\n4. Supabase project paused\n\nYour current domain: " + window.location.origin + "\n\nAdd this to Supabase CORS settings!";
      } else if (error.code === "PGRST204" || status === 204) {
        // 204 is actually success (no content) - table exists but is empty
        console.log("✅ Connection successful (empty table)");
        return { success: true, status: status };
      }
      
      return {
        success: false,
        error: errorMsg,
        help: detailedHelp,
        code: error.code,
        details: error.details || error.hint || "",
        status: status,
        statusText: statusText,
        currentDomain: window.location.origin
      };
    }
    
    console.log("✅ Supabase connection test successful");
    return { success: true, status: status };
  } catch (e) {
    console.error("Supabase connection test exception:", e);
    let errorMsg = e.message || "Unknown error";
    let detailedHelp = "";
    
    if (e.message?.includes("fetch") || e.name === "TypeError" || e.message?.includes("NetworkError")) {
      errorMsg = "Network/CORS error.";
      detailedHelp = "CRITICAL: CORS is not configured!\n\n" +
        "To fix:\n" +
        "1. Go to Supabase Dashboard\n" +
        "2. Settings > API > CORS\n" +
        "3. Add your domain: " + window.location.origin + "\n" +
        "4. Save and refresh this page\n\n" +
        "Current domain: " + window.location.origin + "\n" +
        "Supabase URL: " + SUPABASE_URL;
    }
    
    return {
      success: false,
      error: errorMsg,
      help: detailedHelp,
      type: e.name || "NetworkError",
      stack: e.stack,
      currentDomain: window.location.origin
    };
  }
}

async function submitSecret() {
  const identity = await getOrInitializeIdentity();
  if (!identity) {
    toast("Could not create anonymous identity. Please refresh.", "error");
    return;
  }

  if (localStorage.getItem("hasSentSecret") === "true") {
    toast("⚠️ You have already submitted a secret.", "error");
    return;
  }

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
    // Ensure Supabase client is initialized
    if (!supabaseClient) {
      supabaseClient = initSupabase();
      if (!supabaseClient) {
        throw new Error("Supabase client not initialized. Please refresh the page.");
      }
    }

    // First test connection
    const connectionTest = await testSupabaseConnection();
    if (!connectionTest.success) {
      throw new Error(connectionTest.error);
    }

    // Ensure profile exists before inserting secret
    const { data: profileCheck, error: profileError } = await supabaseClient
      .from('profiles')
      .select('client_id')
      .eq('client_id', identity.clientId)
      .single();

    // If profile doesn't exist, create it
    if (profileError || !profileCheck) {
      console.log("Profile not found, creating new profile...");
      const { error: insertProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          client_id: identity.clientId,
          public_key: JSON.stringify(identity.publicKeyJwk)
        });

      if (insertProfileError) {
        console.error("Failed to create profile:", insertProfileError);
        // Continue anyway - foreign key constraint might not be enforced
      }
    }

    const { data, error } = await supabaseClient
      .from('secrets')
      .insert({
        content: content,
        client_id: identity.clientId
      })
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      let errorMsg = error.message;
      
      // Provide helpful error messages
      if (error.code === "PGRST116") {
        errorMsg = "Table 'secrets' does not exist. Please run supabase-schema.sql in Supabase SQL Editor.";
      } else if (error.code === "23503") {
        errorMsg = "Foreign key violation. Make sure your profile exists in the 'profiles' table.";
      } else if (error.code === "42501") {
        errorMsg = "Permission denied. Check Row Level Security (RLS) policies in Supabase.";
      } else if (error.message.includes("fetch")) {
        errorMsg = "Network error. Check your internet connection and Supabase URL/API key.";
      }
      
      throw new Error("Submission failed: " + errorMsg + (error.details ? " (" + error.details + ")" : ""));
    }

    input.value = "";
    sendMsg.classList.remove("hidden");
    localStorage.setItem("hasSentSecret", "true");
    updateBtnStates();
    toast("✅ Secret submitted!", "success");
  } catch (e) {
    console.error("Submit secret error:", e);
    let errorMessage = e.message;
    
    // Handle network/CORS errors with detailed instructions
    if (e.message.includes("fetch") || e.name === "TypeError" || e.message.includes("NetworkError") || e.message.includes("CORS")) {
      errorMessage = "🚨 CORS/Network Error!\n\n" +
        "Your domain: " + window.location.origin + "\n\n" +
        "Quick Fix:\n" +
        "1. Go to Supabase Dashboard\n" +
        "2. Settings > API > CORS\n" +
        "3. Add: " + window.location.origin + "\n" +
        "4. Save and refresh\n\n" +
        "See console (F12) for details.";
      
      console.error("=== CORS SETUP REQUIRED ===");
      console.error("Current domain:", window.location.origin);
      console.error("Add this to Supabase CORS settings!");
      console.error("Supabase Dashboard > Settings > API > CORS");
      console.error("========================");
    }
    
    toast("Error submitting secret: " + errorMessage, "error");
    lock(sendBtn, false);
  }
}

async function fetchSecret() {
  const identity = await getOrInitializeIdentity();
  if (!identity) {
    toast("Could not create anonymous identity. Please refresh.", "error");
    return;
  }

  if (localStorage.getItem("hasFetchedSecret") === "true") {
    toast("⚠️ You have already fetched a secret.", "error");
    return;
  }

  lock(fetchBtn, true);

  try {
    // Get secrets this user has already viewed
    const { data: seenData, error: seenError } = await supabaseClient
      .from('secret_views')
      .select('secret_id')
      .eq('client_id', identity.clientId);

    if (seenError) {
      throw new Error("Could not fetch seen secrets: " + seenError.message);
    }

    const seenIds = seenData ? seenData.map(r => r.secret_id) : [];

    // Get available secrets
    const { data, error } = await supabaseClient
      .from('secrets')
      .select('id, content, client_id')
      .neq('client_id', identity.clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error("Fetch failed: " + error.message);
    }

    // Filter out seen secrets
    const unseen = data ? data.filter(item => !seenIds.includes(item.id)) : [];

    if (unseen.length > 0) {
      const randomSecretObject = unseen[Math.floor(Math.random() * unseen.length)];
      showSecretModal(randomSecretObject);

      // Mark as viewed
      const { error: viewError } = await supabaseClient
        .from('secret_views')
        .insert({
          secret_id: randomSecretObject.id,
          client_id: identity.clientId
        });

      if (viewError) {
        console.error("Could not mark as seen:", viewError.message);
      }

      localStorage.setItem("hasFetchedSecret", "true");
      updateBtnStates();
    } else {
      toast("No new secrets found.", "error");
      lock(fetchBtn, false);
    }
  } catch (e) {
    toast("Error fetching secret: " + e.message, "error");
    lock(fetchBtn, false);
  }
}

// ========== UTILITY FUNCTIONS ==========

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== INITIALIZATION ==========

// Wait for both DOM and Supabase library to be ready
async function initializeApp() {
  // Wait for Supabase library to load
  if (typeof supabase === 'undefined') {
    console.warn("Supabase library not loaded yet, waiting...");
    // Wait up to 5 seconds for Supabase to load
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (typeof supabase !== 'undefined') {
        break;
      }
    }
    
    if (typeof supabase === 'undefined') {
      console.error("Supabase library failed to load after 5 seconds!");
      toast("❌ Supabase library failed to load. Please check your internet connection and refresh.", "error");
      return;
    }
  }

  // Initialize Supabase client
  if (!supabaseClient) {
    supabaseClient = initSupabase();
    if (!supabaseClient) {
      toast("❌ Failed to initialize Supabase client. Please refresh.", "error");
      return;
    }
  }

  // Set up event listeners
  if (sendBtn) sendBtn.addEventListener("click", submitSecret);
  if (fetchBtn) fetchBtn.addEventListener("click", fetchSecret);
  if (inboxBtn) inboxBtn.addEventListener("click", showInboxModal);
  
  updateBtnStates();
  
  // Test Supabase connection on load
  console.log("Testing Supabase connection...");
  console.log("Current domain:", window.location.origin);
  console.log("Supabase URL:", SUPABASE_URL);
  
  const connectionTest = await testSupabaseConnection();
  if (!connectionTest.success) {
    console.error("Supabase connection test failed:", connectionTest);
    let errorMessage = connectionTest.error;
    
    // Show detailed help message
    if (connectionTest.help) {
      errorMessage += "\n\n" + connectionTest.help;
    }
    
    if (connectionTest.code === "PGRST116") {
      errorMessage = "⚠️ Database tables not found.\n\n" + (connectionTest.help || "Please run supabase-schema.sql in Supabase SQL Editor.");
    } else if (connectionTest.type === "InitializationError") {
      errorMessage = "⚠️ Supabase library not loaded.\n\nCheck your internet connection and refresh the page.";
    } else if (connectionTest.error && (connectionTest.error.includes("fetch") || connectionTest.error.includes("CORS") || connectionTest.error.includes("Network"))) {
      errorMessage = "🚨 CORS ERROR - Configuration Required!\n\n" +
        "Your domain: " + (connectionTest.currentDomain || window.location.origin) + "\n\n" +
        "To fix:\n" +
        "1. Go to Supabase Dashboard\n" +
        "2. Settings > API > CORS\n" +
        "3. Add: " + window.location.origin + "\n" +
        "4. Save and refresh this page\n\n" +
        "See CORS-SETUP.md for detailed instructions.";
    }
    
    toast(errorMessage, "error");
    
    // Also log to console for debugging
    console.error("=== CORS SETUP REQUIRED ===");
    console.error("Add this domain to Supabase CORS:", window.location.origin);
    console.error("Supabase Dashboard > Settings > API > CORS");
    console.error("========================");
  } else {
    console.log("✅ Supabase connection successful");
  }
  
  // Initialize identity
  try {
    const identity = await getOrInitializeIdentity();
    if (identity) {
      console.log(`✅ Anonymous identity ready: ${identity.clientId}`);
    } else {
      console.error("Could not create anonymous identity. Please refresh.");
      toast("Could not create secure identity. Please refresh.", "error");
    }
  } catch (error) {
    console.error("Error initializing identity:", error);
    toast("Error initializing identity: " + error.message, "error");
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready
  initializeApp();
}
