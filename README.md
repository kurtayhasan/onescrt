# onescrt - Anonymous Secrets with End-to-End Encryption

An anonymous secret-sharing platform with end-to-end encryption using RSA-OAEP 4096-bit keys. Share secrets, receive secrets, and reply anonymously with full E2EE protection.

## Features

- 🔒 **End-to-End Encryption**: All messages encrypted using RSA-OAEP 4096-bit with SHA-256
- 👤 **Anonymous**: No accounts, no tracking, completely anonymous
- 📨 **Secret Exchange**: Submit a secret to receive one from another user
- 💬 **Anonymous Replies**: Reply to secrets with encrypted messages
- 📬 **Inbox**: Check your inbox for encrypted replies to your secrets
- 🖼️ **Image/GIF Support**: Send image or GIF URLs in replies
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Technology Stack

- **Frontend**: HTML, CSS (Tailwind), JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL database)
- **Encryption**: Web Crypto API (RSA-OAEP 4096-bit + SHA-256)
- **Hybrid Encryption**: For large messages, uses RSA + AES-GCM hybrid encryption

## Setup Instructions

### 1. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script to create all tables, functions, and policies

### 2. Local Development

1. Clone the repository:
```bash
git clone https://github.com/kurtayhasan/onescrt.git
cd onescrt
```

2. Open `index.html` in a web browser, or use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

3. Open `http://localhost:8000` in your browser

### 3. Configuration

The Supabase URL and API key are already configured in `script.js`. If you need to change them:

```javascript
const SUPABASE_URL = "your-supabase-url";
const API_KEY = "your-supabase-anon-key";
```

## How It Works

1. **User Registration**: When a user first visits, a unique client ID and RSA keypair (4096-bit) are generated
2. **Key Storage**: Public key is stored in Supabase, private key remains in localStorage
3. **Secret Submission**: Users submit secrets (minimum 30 characters)
4. **Secret Retrieval**: After submission, users can retrieve a random secret from another user
5. **Encrypted Replies**: Users can send encrypted replies to secrets they've read
6. **Inbox**: Users can view all encrypted replies sent to their secrets

## Database Schema

### Tables

- **profiles**: Stores user profiles with public keys
- **secrets**: Stores user-submitted secrets
- **secret_views**: Tracks which secrets have been viewed
- **replies**: Stores encrypted replies with metadata

### Key Fields

- `replies.ciphertext`: Encrypted reply content (RSA-OAEP or hybrid encryption)
- `replies.metadata`: JSON metadata (image flag, content type, etc.)
- `profiles.public_key`: RSA public key in JWK format

## Encryption Details

### RSA-OAEP 4096-bit
- **Algorithm**: RSA-OAEP
- **Key Size**: 4096 bits
- **Hash**: SHA-256
- **Max Message Size**: ~446 bytes (direct encryption)

### Hybrid Encryption
For messages larger than 446 bytes:
1. Generate a random AES-256-GCM key
2. Encrypt message with AES
3. Encrypt AES key with RSA-OAEP
4. Store both encrypted data and encrypted key

## Security Features

- ✅ End-to-end encryption (E2EE)
- ✅ Private keys never leave the browser
- ✅ No user accounts or authentication
- ✅ Anonymous interactions
- ✅ Row-level security (RLS) policies
- ✅ No tracking or analytics

## Privacy

All secrets and messages are encrypted end-to-end. No personal information is collected or stored. The platform is completely anonymous. Private keys are stored only in the user's browser localStorage and never transmitted to the server.

## License

MIT License

## Support

For issues or questions, please open an issue on GitHub.
