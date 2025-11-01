# Supabase Database Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com/
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: ai-agent-wallet (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait ~2 minutes for project to be ready

### Step 2: Get Database Connection String

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Step 3: Configure Backend

1. Navigate to `backend/backend/`
2. Create `.env` file (or edit existing):
   ```bash
   cd backend/backend
   # Windows
   copy .env.example .env
   # Mac/Linux
   cp .env.example .env
   ```

3. Open `.env` file and add:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
   
   **Important**: Replace `[YOUR-PASSWORD]` with your actual database password

4. Also add JWT secret:
   ```bash
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   ```

### Step 4: Restart Backend Server

1. Stop the current server (Ctrl+C in the terminal)
2. Restart:
   ```bash
   npm run dev
   ```

3. You should see:
   ```
   ✓ Using DATABASE_URL connection string for Supabase
   ✓ User database initialized successfully
   ```

### Step 5: Test Registration

1. Go to http://localhost:8080/register
2. Try registering with an email and password
3. It should work now! ✅

## Alternative: Manual Database Values

If you prefer not to use the connection string, you can use individual values:

```bash
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
```

## Creating Tables in Supabase

The backend will automatically create the `users` table on first connection. However, if you want to verify:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     password VARCHAR(255) NOT NULL,
     is_verified BOOLEAN DEFAULT FALSE,
     verification_token VARCHAR(255),
     reset_password_token VARCHAR(255),
     reset_password_expires TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
   CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
   CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);
   ```

## Troubleshooting

### "Connection refused" Error

- Check your `DATABASE_URL` is correct
- Verify the password in the connection string matches your Supabase database password
- Ensure your IP is not blocked (check Supabase Dashboard → Settings → Database)

### "Password authentication failed"

- Make sure you replaced `[YOUR-PASSWORD]` with your actual password
- The connection string format should be: `postgresql://postgres:PASSWORD@host:port/database`

### "SSL required"

Supabase requires SSL. The `pg` library handles this automatically when using the connection string.

## Security Notes

⚠️ **Never commit your `.env` file to git!**

The `.env` file contains sensitive credentials. Make sure it's in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

