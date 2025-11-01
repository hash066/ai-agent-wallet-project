# Email-Based Authentication Setup Guide

Complete JWT authentication system has been implemented for both backend and frontend.

## Backend Setup

### 1. Install Dependencies

```bash
cd backend/backend
npm install
```

New packages installed:
- `jsonwebtoken` - JWT token generation and verification
- `bcryptjs` - Password hashing
- `nodemailer` - Email sending
- `express-validator` - Input validation

### 2. Environment Variables

Update `backend/backend/.env`:

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password  # Use App Password, not regular password
FRONTEND_URL=http://localhost:8080

# Database (existing)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_agent_wallet
DB_USER=postgres
DB_PASSWORD=password
```

### 3. Email Setup (Gmail Example)

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Create app password for "Mail"
   - Copy the 16-character password
   - Use this as `EMAIL_PASS` (not your regular password)

For other email providers:
- **Outlook/Hotmail**: Use SMTP server `smtp-mail.outlook.com`, port 587
- **Yahoo**: Use SMTP server `smtp.mail.yahoo.com`, port 587
- **Custom SMTP**: Update `EMAIL_HOST` and `EMAIL_PORT` accordingly

### 4. Database Tables

The UserDatabase class automatically creates:
- `users` table with fields: id, email, password, is_verified, verification_token, reset_password_token, reset_password_expires, created_at, updated_at
- Foreign key relationship: `agents.user_id` references `users.id`

### 5. API Endpoints

**Authentication Routes** (`/api/auth`):
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user (protected)

**Protected Routes** (require JWT token):
- All `/api/v1/*` routes now require authentication
- Token must be sent in header: `Authorization: Bearer <token>`

## Frontend Setup

### 1. Environment Variables

Update `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000
```

### 2. Authentication Pages

All authentication pages are created:
- `/login` - Login page
- `/register` - Registration page
- `/verify-email` - Email verification (auto-verifies on load)
- `/forgot-password` - Password reset request
- `/reset-password` - New password form

### 3. Protected Routes

All dashboard routes are now protected:
- `/` (Dashboard)
- `/agents`
- `/marketplace`
- `/transactions`
- `/analytics`
- `/security`

Unauthenticated users are redirected to `/login`.

### 4. Authentication Context

`AuthContext` provides:
- `login(email, password, rememberMe)` - Login user
- `register(email, password, confirmPassword)` - Register user
- `logout()` - Logout and clear token
- `verifyEmail(token)` - Verify email
- `forgotPassword(email)` - Request reset
- `resetPassword(token, password)` - Reset password
- `user` - Current user object
- `isAuthenticated` - Authentication status
- `isLoading` - Loading state

### 5. API Integration

All API calls automatically include JWT token:
- Token stored in `localStorage` as `auth_token`
- Added to requests as `Authorization: Bearer <token>`
- Auto-redirects to `/login` on 401 errors

## Security Features

1. **Password Requirements**:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number

2. **Token Expiration**:
   - JWT tokens expire in 7 days
   - Verification tokens expire in 24 hours
   - Password reset tokens expire in 1 hour

3. **Password Security**:
   - Passwords hashed with bcrypt (10 rounds)
   - Never stored in plain text

4. **Email Verification**:
   - Users must verify email before login
   - Verification links expire after 24 hours

## Testing the Authentication

### 1. Register a New User

1. Go to http://localhost:8080/register
2. Enter email and password
3. Check password strength indicator
4. Submit form
5. Check email for verification link

### 2. Verify Email

1. Click verification link in email
2. Or go to: http://localhost:8080/verify-email?token=YOUR_TOKEN
3. Should see success message
4. Auto-redirects to login

### 3. Login

1. Go to http://localhost:8080/login
2. Enter email and password
3. Optionally check "Remember me"
4. Submit form
5. Redirected to dashboard

### 4. Access Protected Routes

- All dashboard pages require login
- Attempting to access without login redirects to `/login`
- Token automatically included in API requests

### 5. Password Reset

1. Go to http://localhost:8080/forgot-password
2. Enter email
3. Check email for reset link
4. Click link or go to: http://localhost:8080/reset-password?token=TOKEN
5. Enter new password
6. Submit form
7. Redirected to login

## Troubleshooting

### Email Not Sending

1. Check `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` in `.env`
2. For Gmail: Use App Password (not regular password)
3. Check email service logs in backend console
4. Verify SMTP server allows connections from your IP

### JWT Token Invalid

1. Check `JWT_SECRET` is set in backend `.env`
2. Ensure token is being sent in `Authorization` header
3. Token may have expired (7 days) - re-login

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. UserDatabase creates tables automatically on first connection

### CORS Issues

Backend CORS is configured to allow:
- http://localhost:5173
- http://localhost:8080

Update `CORS_ORIGIN` in backend `.env` if using different ports.

## Next Steps

1. **Update Agent Routes**: Associate agents with `userId` from JWT token
2. **Add Role-Based Access**: Implement admin/user roles if needed
3. **Add Refresh Tokens**: For better security and user experience
4. **Session Management**: Track active sessions and allow logout from all devices

## Important Security Notes

⚠️ **Production Deployment**:
1. Change `JWT_SECRET` to a strong, random string
2. Use HTTPS for all connections
3. Set `NODE_ENV=production`
4. Use secure email service (SMTP over TLS)
5. Implement rate limiting on auth endpoints
6. Add CSRF protection
7. Use environment variables for all secrets (never commit to git)

