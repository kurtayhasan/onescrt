# Supabase API Key Setup Guide

## Checking if Your API Key is Valid

### Step 1: Verify Project Status

1. Go to https://supabase.com/dashboard
2. Check if your project is **active** (not paused)
3. If paused, resume it first

### Step 2: Get Your API Key

1. In Supabase Dashboard, go to **Settings** > **API**
2. Find the **Project URL** - this is your `SUPABASE_URL`
3. Find the **anon/public** key - this is your `API_KEY`
4. Copy both values

### Step 3: Update script.js

Open `script.js` and update these lines:

```javascript
const SUPABASE_URL = "https://your-project-id.supabase.co";
const API_KEY = "your-anon-public-key-here";
```

### Step 4: Verify API Key

After updating, refresh the page and check the browser console (F12):
- If you see "✅ Credentials validated" - API key is valid
- If you see "API key is invalid or expired" - get a new key

## Common Issues

### API Key Expired

**Symptoms:**
- 401 or 403 errors
- "API key is invalid" message

**Solution:**
1. Go to Supabase Dashboard > Settings > API
2. Copy the **anon/public** key (not service_role key)
3. Update `API_KEY` in script.js
4. Refresh the page

### Project Paused

**Symptoms:**
- Cannot connect to Supabase
- CORS errors
- 503 errors

**Solution:**
1. Go to Supabase Dashboard
2. Check project status
3. If paused, click "Resume" or "Restore"
4. Wait for project to be active
5. Refresh your application

### Wrong API Key Type

**Important:** Use the **anon/public** key, NOT the **service_role** key!

- ✅ **anon/public** key - Safe for client-side use
- ❌ **service_role** key - NEVER use in client-side code (security risk!)

### CORS Still Not Working After Adding Domain

**Checklist:**
1. Did you save the CORS settings? (Click Save button)
2. Did you add the exact domain? (including https://)
3. Is your project active? (not paused)
4. Did you wait a few seconds after saving? (changes may take a moment)

## Testing Your Setup

### Test 1: Check API Key Validity

Open browser console (F12) and run:

```javascript
fetch('https://your-project-id.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'your-api-key-here',
    'Authorization': 'Bearer your-api-key-here'
  }
})
.then(r => {
  console.log('Status:', r.status);
  if (r.status === 401 || r.status === 403) {
    console.error('❌ API key is invalid!');
  } else {
    console.log('✅ API key is valid');
  }
})
.catch(e => {
  console.error('❌ CORS error:', e);
  console.log('Add your domain to Supabase CORS settings!');
});
```

### Test 2: Check CORS

If Test 1 fails with CORS error, you need to:
1. Add your domain to Supabase CORS settings
2. Save and wait a few seconds
3. Refresh and test again

## Getting Help

If you're still having issues:

1. Check browser console (F12) for detailed error messages
2. Verify project is active in Supabase Dashboard
3. Verify API key is correct (anon/public key)
4. Verify CORS includes your exact domain
5. Check Supabase status page for outages

## Security Notes

- Never commit your API key to public repositories
- Use environment variables in production
- Only use the anon/public key in client-side code
- Never use the service_role key in frontend code

