# Free Plan CORS Fix Guide

## Important Note

**CORS settings are FREE and available on all Supabase plans!**

You're confusing two different things:
- ❌ **Custom Domain** (paid feature) - Your own domain for Supabase project
- ✅ **CORS Allowed Origins** (FREE) - Which domains can access your Supabase API

**We need CORS Allowed Origins, NOT custom domain!**

## Step 1: Find CORS Settings (FREE)

### Method 1: Settings > API > CORS
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (left sidebar)
4. Click **API** (under Settings)
5. Scroll down to find **"CORS"** or **"Allowed Origins"** section
6. This is FREE and available on all plans!

### Method 2: Project Settings > API
1. Click the gear icon (⚙️) at top left
2. Select **API**
3. Look for **CORS** section
4. Add your domain here

### Method 3: Database Settings
1. Go to **Database** (left sidebar)
2. Click **Settings**
3. Look for API or CORS settings

## Step 2: Add Your Domain to CORS (FREE)

In the CORS section:
1. You'll see a text area or input field
2. Add: `https://www.onescrt.com`
3. Also add: `https://onescrt.com` (without www)
4. Click **Save**
5. Wait 30 seconds
6. Refresh your website

## Step 3: If CORS Section Doesn't Exist

### Check 1: Project Status
- Is project **ACTIVE**? (not paused)
- If paused, click **Resume** first
- Paused projects don't show CORS settings

### Check 2: Supabase Version
- Older projects might need migration
- Check if there's a "Migrate" or "Upgrade" button
- This doesn't cost money, just updates the project

### Check 3: Browser Cache
- Clear browser cache
- Try incognito/private mode
- Try different browser

## Step 4: Verify CORS is Working

After adding domain to CORS:
1. Wait 30 seconds
2. Refresh your website
3. Open browser console (F12)
4. You should see: "✅ Credentials appear valid (CORS is working)"

## Alternative Solution: Use Vercel/Netlify Proxy

If CORS settings truly don't exist (unlikely), you can use a proxy:

### Option A: Vercel Edge Function (FREE)
Create a proxy function that forwards requests to Supabase.

### Option B: Netlify Function (FREE)
Similar to Vercel, create a serverless function.

But first, try to find CORS settings - they should be there!

## Still Can't Find CORS?

### Contact Supabase Support
1. Go to https://supabase.com/support
2. Explain: "I'm on free plan, can't find CORS settings"
3. They'll help you locate it

### Check Supabase Docs
1. Go to https://supabase.com/docs/guides/api
2. Search for "CORS"
3. Follow latest instructions

## Quick Test

Run this in browser console on your website:

```javascript
// Test if CORS is working
fetch('https://rupebvabajtqnwpwytjf.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
})
.then(r => {
  if (r.status === 0) {
    console.error('❌ CORS ERROR - Add domain to CORS settings!');
  } else {
    console.log('✅ CORS is working!');
  }
});
```

## Summary

- ✅ CORS settings are FREE
- ✅ Available on all Supabase plans
- ✅ Located in Settings > API > CORS
- ❌ Custom domain is different (paid feature)
- ❌ We don't need custom domain, we need CORS!

## Next Steps

1. Go to Supabase Dashboard
2. Settings > API
3. Find CORS section (scroll down)
4. Add: `https://www.onescrt.com`
5. Save and test

If you still can't find it, take a screenshot of your Settings > API page and I'll help you locate it!

