# ⚡ Quick Supabase Setup (2 minutes)

## Get Your Supabase Connection String

1. **Go to Supabase**: https://supabase.com/
   - Sign up (FREE) or login

2. **Create New Project**:
   - Click "New Project"
   - Project name: `ai-agent-wallet` (or any name)
   - Database password: Create a strong password (SAVE IT!)
   - Region: Choose closest to you
   - Click "Create new project"
   - Wait ~2 minutes

3. **Get Connection String**:
   - Go to **Settings** → **Database**
   - Scroll to **Connection string**
   - Click **URI** tab
   - Copy the connection string
   - It looks like: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

4. **Add to .env file**:
   - Open `backend/backend/.env`
   - Find the line: `# DATABASE_URL=...`
   - Uncomment it and paste your connection string:
     ```
     DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
     ```
   - **IMPORTANT**: Replace `[YOUR-PASSWORD]` with your actual database password!

5. **Add JWT Secret**:
   - In the same `.env` file, find `JWT_SECRET=`
   - Keep the generated value or change it to a strong secret

6. **Restart Server**:
   - Stop current server (Ctrl+C)
   - Run: `npm run dev`
   - You should see: `✓ Using DATABASE_URL connection string for Supabase`

7. **Test Registration**:
   - Go to http://localhost:8080/register
   - Try registering - it should work! ✅

## Need Help?

If you already have Supabase credentials, just:
1. Copy your connection string
2. Add `DATABASE_URL=...` to `.env`
3. Restart server
4. Test registration!

