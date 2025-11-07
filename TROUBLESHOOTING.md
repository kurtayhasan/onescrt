# Troubleshooting Guide

## Common Errors and Solutions

### 1. "Failed to fetch" Error

This error typically indicates a network or CORS issue.

**Possible Causes:**
- Supabase tables not created
- CORS not configured
- Network connectivity issues
- Wrong Supabase URL/API key

**Solutions:**

#### Step 1: Verify Database Tables
1. Go to Supabase Dashboard
2. Navigate to **Table Editor**
3. Verify these tables exist:
   - `profiles`
   - `secrets`
   - `secret_views`
   - `replies`

If tables don't exist:
1. Go to **SQL Editor**
2. Copy and paste `supabase-schema.sql`
3. Click **Run**

#### Step 2: Check CORS Settings
1. Go to Supabase Dashboard
2. Navigate to **Settings** > **API**
3. Under **CORS**, add your domain:
   - For local development: `http://localhost:8000`
   - For production: your production domain (e.g., `https://yourdomain.com`)
4. Or use `*` for development (not recommended for production)

#### Step 3: Verify Supabase Configuration
Check `script.js`:
```javascript
const SUPABASE_URL = "https://your-project.supabase.co";
const API_KEY = "your-anon-key";
```

Get these from:
1. Supabase Dashboard
2. **Settings** > **API**
3. Copy **Project URL** and **anon/public** key

#### Step 4: Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for detailed error messages
4. Check **Network** tab for failed requests

### 2. "Table 'secrets' does not exist" Error

**Solution:**
Run the SQL schema in Supabase:
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `supabase-schema.sql`
3. Paste and run
4. Refresh the application

### 3. "Permission denied" Error (RLS)

**Solution:**
1. Go to Supabase Dashboard > **Table Editor**
2. Select the table (e.g., `secrets`)
3. Go to **Policies** tab
4. Verify RLS policies are set correctly
5. Re-run `supabase-schema.sql` to recreate policies

### 4. "Foreign key violation" Error

**Solution:**
This happens when trying to insert a secret before profile exists. The app should automatically create the profile, but if it fails:
1. Check browser console for profile creation errors
2. Verify `profiles` table exists
3. Clear localStorage and refresh to regenerate profile

### 5. Encryption/Decryption Errors

**Possible Causes:**
- Private key missing from localStorage
- Corrupted key data
- Browser doesn't support Web Crypto API

**Solutions:**
1. Clear browser localStorage:
   ```javascript
   // In browser console:
   localStorage.clear();
   ```
2. Refresh the page to regenerate keys
3. Use a modern browser (Chrome, Firefox, Edge, Safari)

### 6. "Cannot connect to Supabase" Error

**Checklist:**
- [ ] Internet connection is working
- [ ] Supabase project is active (not paused)
- [ ] Supabase URL is correct
- [ ] API key is correct (anon/public key, not service key)
- [ ] CORS is configured
- [ ] Tables are created

### 7. Local Development Issues

**Using HTTP instead of HTTPS:**
- Web Crypto API requires HTTPS
- For local development, use `http://localhost` (allowed exception)
- For production, use HTTPS

**Port conflicts:**
```bash
# Try different ports
python -m http.server 8001
# or
npx http-server -p 8080
```

## Debug Mode

To enable detailed logging, open browser console (F12) and check:
- Network requests to Supabase
- Console errors
- LocalStorage contents

## Getting Help

If you're still experiencing issues:

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for error messages

2. **Check Network Tab:**
   - Open Developer Tools (F12)
   - Go to Network tab
   - Try submitting a secret
   - Look for failed requests
   - Check request/response details

3. **Verify Supabase:**
   - Go to Supabase Dashboard
   - Check Table Editor for data
   - Check SQL Editor for errors
   - Check Logs for API errors

4. **Common Issues:**
   - Make sure you're using the **anon/public** key, not the service key
   - Verify RLS policies allow the operations you need
   - Check that all tables have the correct structure

## Testing Checklist

Before deploying:
- [ ] All tables created in Supabase
- [ ] RLS policies enabled and configured
- [ ] Can create profile (automatic on first visit)
- [ ] Can submit secret
- [ ] Can fetch secret
- [ ] Can send reply
- [ ] Can view inbox
- [ ] Encryption/decryption works
- [ ] Works on HTTPS (for production)

## Contact

If you continue to have issues:
1. Check the browser console for detailed error messages
2. Verify all steps in this guide
3. Check Supabase documentation
4. Open an issue on GitHub with:
   - Browser and version
   - Error message
   - Steps to reproduce
   - Console logs

