# Deployment Guide

## Pre-Deployment Checklist

- [ ] Run `supabase-schema.sql` in Supabase SQL Editor
- [ ] Verify all tables are created (profiles, secrets, secret_views, replies)
- [ ] Test the application locally
- [ ] Verify encryption/decryption works
- [ ] Test inbox functionality
- [ ] Test reply functionality

## Files to Deploy

Deploy these files to your hosting service:

```
onescrt/
├── index.html          # Main HTML file
├── script.js           # Main JavaScript with E2EE
├── privacy.html        # Privacy policy page
├── logo.png           # Logo image
├── README.md          # Documentation
└── .gitignore         # Git ignore file
```

**Note:** Do NOT deploy:
- `supabase-schema.sql` (already run in Supabase)
- `SETUP.md` (development documentation)
- `DEPLOYMENT.md` (this file)
- `package.json` (optional, for local development)

## Hosting Options

### Vercel
1. Push code to GitHub
2. Import repository to Vercel
3. Deploy (no build step needed)

### Netlify
1. Push code to GitHub
2. Connect repository to Netlify
3. Set build command: (leave empty)
4. Set publish directory: `/` (root)
5. Deploy

### GitHub Pages
1. Push code to GitHub repository
2. Go to Settings > Pages
3. Select source branch (usually `main`)
4. Save

### Static Hosting (S3, CloudFlare Pages, etc.)
Simply upload all files to your hosting service.

## Post-Deployment

1. Test the application in production
2. Verify Supabase connection works
3. Test encryption/decryption
4. Test inbox and reply functionality
5. Monitor for any errors in browser console

## Important Notes

- The application requires HTTPS for Web Crypto API to work properly
- Ensure CORS is properly configured in Supabase if needed
- Private keys are stored in localStorage - users should be aware of this
- Clearing browser data will create a new identity

## Troubleshooting

### Web Crypto API not working
- Ensure you're using HTTPS (required for Web Crypto API)
- Check browser compatibility (modern browsers only)

### Supabase connection issues
- Verify Supabase URL and API key in `script.js`
- Check Supabase project is active
- Verify RLS policies allow necessary operations

### Encryption errors
- RSA key generation can take a few seconds - be patient
- Check browser console for detailed error messages
- Ensure private key is stored in localStorage

