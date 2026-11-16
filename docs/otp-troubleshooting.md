# OTP delivery checklist

The customer registration and OTP login screen use **Firebase Phone Authentication**, not the backend Fast2SMS service. The backend `/api/auth/firebase-phone-login` endpoint validates Firebase's ID token. The separate `/api/auth/send-login-otp` endpoint uses Fast2SMS.

## Firebase Phone Auth (customer OTP)

1. In Firebase Console, select the same project as the frontend config. Enable **Authentication > Sign-in method > Phone**.
2. In **Authentication > Settings > Authorized domains**, add the exact deployed website hostname, including any custom domain used for sign-in. Local development domains must also be authorized where appropriate.
3. Configure `VITE_FIREBASE_*` in your **frontend** hosting environment; redeploy after changing them. Match `FIREBASE_WEB_API_KEY` in the **backend** environment to the same Firebase project's Web API key.
4. Check SMS region policy, account billing/usage restrictions and quota in Firebase Console for India (+91). Check Google Cloud API key restrictions and the Identity Toolkit API as applicable.
5. Open the site with browser developer tools and reproduce once. Record the Firebase `auth/...` error code and network status; **never** share actual SMS codes, ID tokens, secrets or full phone numbers.
6. Try Firebase test phone numbers to verify the app flow without sending real SMS; test numbers **do not prove** real SMS delivery.

## Fast2SMS (separate backend OTP route)

Set `FAST2SMS_API_KEY` only in the backend deployment environment. Confirm the Fast2SMS account is permitted to send OTP messages and the provider accepts the request. Check backend logs for `OTP SMS sending failed:`. The API returns HTTP 503 when delivery submission fails.

## Important

Deploy configuration is not stored in GitHub and cannot be confirmed from this repository. These code/documentation updates alone do not guarantee live OTP delivery. Never commit `.env` files containing real credentials.
