# Google Authentication Setup for WAFEO

## Overview
This guide explains how to set up Google Sign-In for the WAFEO platform.

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add authorized JavaScript origins:
   - `https://norbertmuzila.github.io`
   - `https://wafeo.up.railway.app`
   - `http://localhost:3000` (for local development)
7. Add authorized redirect URIs:
   - `https://norbertmuzila.github.io`
   - `https://wafeo.up.railway.app`
   - `http://localhost:3000`
8. Click "Create" and copy your Client ID

## Step 2: Configure the Application

### Frontend Configuration
In `app.js`, replace the placeholder with your actual Google Client ID:

```javascript
const googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

### Backend Configuration
1. Install the Google Auth Library:
```bash
npm install google-auth-library
```

2. Update the `verifyGoogleToken` function in `server.js`:
```javascript
const { OAuth2Client } = require('google-auth-library');

async function verifyGoogleToken(token) {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  return ticket.getPayload();
}
```

3. Add your Google Client ID to the `.env` file:
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Step 3: Update CORS Settings

Ensure your backend CORS settings include all the domains where your app is hosted:

```javascript
app.use(cors({
  origin: [
    'https://norbertmuzila.github.io',
    'https://wafeo.up.railway.app',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
```

## Step 4: Test the Implementation

1. Start your backend server: `node server.js`
2. Open the frontend in your browser
3. Click the "Sign in with Google" button
4. Complete the Google authentication flow
5. You should be logged in and redirected to the dashboard

## Troubleshooting

- **Invalid Client ID**: Double-check your Google Client ID is correct
- **CORS Errors**: Ensure all domains are listed in CORS settings
- **Token Verification Failed**: Check that your Google Client ID matches exactly
- **Redirect URI Mismatch**: Verify all authorized redirect URIs in Google Cloud Console

## Security Notes

- Never commit your Google Client ID or JWT secret to version control
- Use environment variables for sensitive configuration
- In production, use HTTPS for all connections
- Consider implementing additional security measures like CSRF protection

## User Management

When a user signs in with Google for the first time:
- A new user account is automatically created
- Default role is set to "farmer"
- The user's Google ID is stored for future logins
- No password is required for Google-authenticated users
