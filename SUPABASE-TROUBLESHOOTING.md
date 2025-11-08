# Supabase CORS Troubleshooting Guide

## Current Error
🚨 Cannot connect to Supabase - CORS issue detected

## Your Configuration
- Domain: https://www.onescrt.com
- Supabase URL: https://rupebvabajtqnwpwytjf.supabase.co

## Step-by-Step Fix

### Step 1: Check Project Status

1. Go to https://supabase.com/dashboard
2. Look for your project: `rupebvabajtqnwpwytjf`
3. Check if project shows:
   - ✅ **Active** (green) - Good, continue to Step 2
   - ⚠️ **Paused** (yellow/orange) - Click "Resume" or "Restore"
   - ❌ **Deleted/Archived** - You need to restore it or create a new project

### Step 2: Find CORS Settings

CORS settings location may vary depending on Supabase version:

#### Option A: Settings > API > CORS (Old UI)
1. Go to Settings > API
2. Scroll down to find "CORS" section
3. You should see a text area or input field
4. Add: `https://www.onescrt.com`
5. Click "Save"

#### Option B: Project Settings > API (New UI)
1. Go to Project Settings (gear icon)
2. Click "API" in the sidebar
3. Look for "CORS" or "Allowed Origins"
4. Add: `https://www.onescrt.com`
5. Click "Save"

#### Option C: Database > Settings > API
1. Go to Database
2. Click Settings
3. Look for API settings
4. Find CORS section
5. Add your domain

#### Option D: If CORS Section Doesn't Exist

If you cannot find CORS settings:

1. **Check Supabase Plan**: Free tier should have CORS settings
2. **Check Project Age**: Very old projects might need migration
3. **Try Creating New API Key**: 
   - Settings > API
   - Regenerate "anon/public" key
   - Update script.js with new key
4. **Contact Supabase Support**: 
   - If CORS settings are missing, contact support
   - This might be a bug or account issue

### Step 3: Verify API Key

1. Go to Settings > API
2. Find "Project URL" - should be: `https://rupebvabajtqnwpwytjf.supabase.co`
3. Find "anon public" key - copy this
4. Verify it matches the key in script.js
5. If different, update script.js with the new key

### Step 4: Test Connection

After adding CORS:
1. Wait 10-30 seconds (CORS changes may take time)
2. Refresh your website
3. Open browser console (F12)
4. Look for:
   - ✅ "Credentials appear valid (CORS is working)"
   - ✅ "Supabase connection test successful"

### Step 5: Alternative - Check Supabase Status

If still not working:
1. Check https://status.supabase.com
2. Check if there are any outages
3. Try accessing Supabase dashboard - does it load?

## Common Issues

### Issue 1: Project is Paused
**Symptom**: CORS settings don't appear
**Solution**: Resume the project first

### Issue 2: Wrong Supabase Account
**Symptom**: Project doesn't exist
**Solution**: Make sure you're logged into the correct Supabase account

### Issue 3: API Key Expired
**Symptom**: 401/403 errors
**Solution**: Get new API key from Settings > API

### Issue 4: CORS Settings Not Saving
**Symptom**: Changes don't persist
**Solution**: 
- Clear browser cache
- Try different browser
- Check if you have proper permissions

### Issue 5: Domain Format Wrong
**Symptom**: CORS added but still not working
**Solution**: 
- Make sure you include `https://`
- No trailing slash: `https://www.onescrt.com` ✅ (not `https://www.onescrt.com/` ❌)
- Try both with and without `www`: `https://onescrt.com` and `https://www.onescrt.com`

## Quick Test

Test if CORS is working by running this in browser console on your website:

```javascript
fetch('https://rupebvabajtqnwpwytjf.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'your-api-key-here',
    'Authorization': 'Bearer your-api-key-here'
  }
})
.then(r => {
  console.log('Status:', r.status);
  if (r.status === 0) {
    console.error('❌ CORS ERROR - Domain not allowed');
  } else if (r.status === 401 || r.status === 403) {
    console.error('❌ API KEY ERROR - Invalid key');
  } else {
    console.log('✅ CORS is working!');
  }
})
.catch(e => {
  console.error('❌ Error:', e);
});
```

## Still Not Working?

If CORS settings are truly missing:

1. **Create a new Supabase project**:
   - Create fresh project
   - Run supabase-schema.sql
   - Update script.js with new URL and API key
   - Configure CORS for new project

2. **Use Supabase Edge Functions** (Advanced):
   - Create an edge function as a proxy
   - This bypasses CORS but requires server-side code

3. **Contact Supabase Support**:
   - Explain that CORS settings are missing
   - They can help restore or fix your project

## Verification Checklist

- [ ] Project is active (not paused)
- [ ] Found CORS settings in Supabase dashboard
- [ ] Added `https://www.onescrt.com` to CORS
- [ ] Clicked "Save" and saw confirmation
- [ ] Waited 30 seconds after saving
- [ ] Verified API key is correct
- [ ] Verified Supabase URL is correct
- [ ] Refreshed website
- [ ] Checked browser console for errors
- [ ] Tested connection

## Next Steps

After completing the checklist:
1. Refresh your website
2. Check browser console (F12)
3. If still errors, share the exact console error message
4. Take a screenshot of Supabase Settings > API page (if possible)

