# CORS Setup Guide for Supabase

## Step 1: Configure CORS in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** > **API**
4. Scroll down to **CORS** section
5. Add the following URLs (one per line):
   - Your production domain (e.g., `https://yourdomain.com`)
   - `https://*.vercel.app` (if using Vercel)
   - `https://*.netlify.app` (if using Netlify)
   - `https://*.github.io` (if using GitHub Pages)
   - `http://localhost:8000` (for local development)

6. Click **Save**

## Step 2: Verify Supabase URL and API Key

In `script.js`, verify these values are correct:

```javascript
const SUPABASE_URL = "https://your-project-id.supabase.co";
const API_KEY = "your-anon-public-key";
```

To get these:
1. Go to Supabase Dashboard > Settings > API
2. Copy **Project URL** (this is your SUPABASE_URL)
3. Copy **anon/public** key (this is your API_KEY)

## Step 3: Test Connection

After configuring CORS:
1. Refresh your application
2. Open browser console (F12)
3. Check for connection test messages
4. If you see "✅ Supabase connection successful", CORS is configured correctly

## Common CORS Errors

### "Network error" or "Failed to fetch"
- **Cause**: CORS not configured or wrong domain
- **Solution**: Add your domain to Supabase CORS settings

### "CORS policy" error in console
- **Cause**: Domain not allowed in CORS
- **Solution**: Add exact domain (including protocol: https://) to CORS settings

### "TypeError: Failed to fetch"
- **Cause**: Network issue or CORS misconfiguration
- **Solution**: 
  1. Check internet connection
  2. Verify Supabase URL is correct
  3. Verify CORS includes your domain
  4. Check browser console for detailed error

## Quick Test

After configuring CORS, test with this in browser console:

```javascript
fetch('https://your-project-id.supabase.co/rest/v1/profiles?select=client_id&limit=1', {
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer your-anon-key'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

If this works, CORS is configured correctly.

