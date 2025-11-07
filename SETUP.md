# OneScrt Setup Guide

## Quick Start

### Step 1: Database Setup

1. Log in to your Supabase dashboard
2. Go to **SQL Editor**
3. Copy the entire content from `supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the SQL script

This will create:
- `profiles` table (stores user profiles with public keys)
- `secrets` table (stores user-submitted secrets)
- `secret_views` table (tracks viewed secrets)
- `replies` table (stores encrypted replies)
- Required indexes and functions
- Row-level security (RLS) policies

### Step 2: Verify Tables

After running the SQL script, verify that all tables were created:

1. Go to **Table Editor** in Supabase
2. You should see 4 tables: `profiles`, `secrets`, `secret_views`, `replies`

### Step 3: Test the Application

1. Open `index.html` in a web browser (or use a local server)
2. The application should automatically:
   - Generate a client ID and RSA keypair
   - Register the profile in Supabase
   - Be ready to use

## Troubleshooting

### "Profile registration failed"
- Check that the `profiles` table exists
- Verify RLS policies allow inserts
- Check browser console for detailed error messages

### "Could not fetch secrets"
- Verify the `secrets` table exists
- Check that RLS policies allow selects
- Ensure you have at least one secret in the database

### "Decryption error"
- This usually means the private key is missing or corrupted
- Clear localStorage and refresh the page to generate a new keypair
- Note: This will create a new identity, and you won't be able to decrypt old messages

### "Could not fetch replies"
- Verify the `replies` table exists
- Check that the `get_recipient_replies` function exists
- Ensure RLS policies allow selects

## Database Maintenance

### Viewing Data

You can view all data in the Supabase Table Editor:
- **profiles**: See all registered users and their public keys
- **secrets**: See all submitted secrets (content is plaintext)
- **secret_views**: See which secrets have been viewed
- **replies**: See all replies (ciphertext is encrypted)

### Cleaning Up

To clean up test data:
```sql
-- Delete all test data (use with caution!)
DELETE FROM replies;
DELETE FROM secret_views;
DELETE FROM secrets;
DELETE FROM profiles;
```

## Production Deployment

### Security Checklist

- [ ] Verify RLS policies are enabled on all tables
- [ ] Review and test all RLS policies
- [ ] Ensure Supabase project is not in development mode
- [ ] Set up proper CORS policies
- [ ] Consider adding rate limiting
- [ ] Set up monitoring and logging

### Environment Variables

For production, consider moving Supabase credentials to environment variables or a config file that's not committed to git.

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs for database errors
3. Verify all tables and functions were created correctly
4. Open an issue on GitHub with detailed error messages

