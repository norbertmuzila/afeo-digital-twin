# 🚀 Deployment Guide for Google Authentication

## Quick Deployment Steps

### 1. Test Locally First

```bash
# Start the backend server
cd afeo-digital-twin
node server.js
```

Then open `index.html` in your browser to test the Google Sign-In button.

### 2. Set Up Google OAuth Credentials

**This is CRITICAL for Google Sign-In to work:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project called "WAFEO Authentication"
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add these **Authorized JavaScript origins**:
   - `https://norbertmuzila.github.io`
   - `https://wafeo.up.railway.app`
   - `http://localhost:3000`
7. Add these **Authorized redirect URIs**:
   - `https://norbertmuzila.github.io`
   - `https://wafeo.up.railway.app`
   - `http://localhost:3000`
8. Click "Create" and **copy your Client ID**

### 3. Update the Code with Your Google Client ID

Open `app.js` and replace:
```javascript
const googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

With your actual Google Client ID:
```javascript
const googleClientId = '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
```

### 4. Deploy to GitHub Pages (Frontend)

```bash
# Commit your changes
git add .
git commit -m "Add Google Sign-In authentication"
git push origin main
```

GitHub Pages will automatically update within 1-2 minutes.

### 5. Deploy to Railway (Backend)

**Option A: Automatic (Recommended)**
```bash
git push origin main
```
Railway will automatically detect the change and redeploy.

**Option B: Manual Redeploy**
1. Go to [Railway.app](https://railway.app/)
2. Select your WAFEO project
3. Click "Deploy" > "Trigger Deploy"
4. Wait for the deployment to complete (usually < 2 minutes)

### 6. Add Environment Variable to Railway

1. In Railway dashboard, go to your project
2. Click "Variables" tab
3. Add a new variable:
   - **Name**: `GOOGLE_CLIENT_ID`
   - **Value**: `your-google-client-id.apps.googleusercontent.com` (the same one you used in app.js)
4. Click "Add" and redeploy

### 7. Update Backend Token Verification (Important!)

For **production**, you need to update the token verification in `server.js`:

```bash
# Install the Google Auth Library
npm install google-auth-library
```

Then replace the `verifyGoogleToken` function in `server.js` with:

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

### 8. Test the Live Deployment

1. Go to [https://norbertmuzila.github.io/wafeo/](https://norbertmuzila.github.io/wafeo/)
2. Click "Sign in with Google"
3. Complete the Google authentication flow
4. You should be logged in and see the dashboard

## Troubleshooting

### "Google button not appearing"
- Check browser console for errors
- Ensure internet connection is working
- Verify Google Identity Services script is loaded in index.html

### "Invalid Client ID"
- Double-check your Google Client ID is correct
- Ensure it matches exactly in both frontend and Railway environment variables
- Verify the client ID is for a "Web application" type

### "CORS errors"
- Check Railway CORS settings in server.js
- Ensure all domains are listed:
  ```javascript
  origin: [
    'https://norbertmuzila.github.io',
    'https://wafeo.up.railway.app',
    'http://localhost:3000'
  ]
  ```

### "Redirect URI mismatch"
- Go to Google Cloud Console
- Check "Authorized redirect URIs" include all your domains
- Add any missing URIs

### "User not created / login failed"
- Check browser console for API errors
- Verify backend is running and accessible
- Test the `/api/auth/google` endpoint with Postman or curl

## Complete Deployment Checklist

- [ ] Google OAuth credentials created in Google Cloud Console
- [ ] Google Client ID added to `app.js`
- [ ] Google Client ID added to Railway environment variables
- [ ] Google Auth Library installed (`npm install google-auth-library`)
- [ ] Token verification updated in `server.js` (for production)
- [ ] All domains added to Google authorized origins/URIs
- [ ] CORS settings updated in `server.js`
- [ ] Changes committed and pushed to GitHub
- [ ] Railway deployment completed successfully
- [ ] Tested Google Sign-In on production site
- [ ] Tested traditional login still works

## Expected Timeline

- **Local testing**: 5-10 minutes
- **Google OAuth setup**: 10-15 minutes
- **GitHub Pages deployment**: 1-2 minutes (automatic)
- **Railway deployment**: 2-5 minutes (automatic)
- **Total**: ~30 minutes for full deployment

Once deployed, users will immediately see the "Sign in with Google" button and can use their Google accounts to log in! 🎉