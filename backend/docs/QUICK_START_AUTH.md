# Quick Start - Email Authentication

## 🚀 Quick Setup (5 minutes)

### Backend

1. **Install dependencies:**
   ```bash
   cd backend/backend
   npm install
   ```

2. **Update `.env` file:**
   ```bash
   # Add these lines to backend/backend/.env
   JWT_SECRET=your-secret-key-here-change-this
   FRONTEND_URL=http://localhost:8080
   
   # Email (optional - server works without email, but won't send verification emails)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

3. **Start backend:**
   ```bash
   npm run dev
   ```

### Frontend

1. **No additional dependencies needed** (React Router already installed)

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

## 📝 Test Flow

1. **Open browser:** http://localhost:8080
2. **Auto-redirects to:** http://localhost:8080/login
3. **Click "Sign up"** → Go to registration
4. **Register with email/password** → Shows "Check email" message
5. **Check console/logs** for verification token (if email not configured)
6. **Copy token from logs** → Visit: http://localhost:8080/verify-email?token=TOKEN
7. **Login** with your credentials
8. **Access dashboard** - All routes now protected!

## ⚠️ Without Email Setup

If you don't configure email:
- **Registration works** but verification email won't send
- **Check backend console** - verification token will be logged
- **Manually verify** by calling API or checking database
- **Or use:** Database query to mark user as verified directly

## 🔧 Manual Email Verification (for testing)

If email not configured, verify user manually:

```sql
-- Connect to your database
UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE email = 'your@email.com';
```

Then login normally!

## ✅ What's Working

- ✅ User registration
- ✅ Email verification flow
- ✅ Login with JWT tokens
- ✅ Password reset
- ✅ Protected routes (all dashboard pages)
- ✅ Auto token refresh on page load
- ✅ Logout functionality
- ✅ User email display in navbar

All authentication features are fully implemented and ready to use!

