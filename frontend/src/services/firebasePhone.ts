const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAVdZx21Nf_BSizmRZEwThZppjez8ACvRU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "life-insurance-ee3f7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "life-insurance-ee3f7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "life-insurance-ee3f7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "662761285549",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:662761285549:web:825bca6d4f99c9ed44e324",
};

type ConfirmationResultLike = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }>;
};

let confirmationResult: ConfirmationResultLike | null = null;
let recaptchaVerifier: { clear?: () => void } | null = null;
let otpSendInProgress = false;

const loadFirebase = async () => {
  const appUrl = "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
  const authUrl = "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
  const appModule = await import(/* @vite-ignore */ appUrl);
  const authModule = await import(/* @vite-ignore */ authUrl);
  const app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(firebaseConfig);
  return { authModule, auth: authModule.getAuth(app) };
};

export const sendFirebasePhoneOtp = async (phone: string) => {
  if (otpSendInProgress) throw new Error("OTP request already in progress. Please wait.");
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("auth/invalid-phone-number");
  otpSendInProgress = true;
  try {
    const { authModule, auth } = await loadFirebase();
    if (!recaptchaVerifier) {
      recaptchaVerifier = new authModule.RecaptchaVerifier(auth, "firebase-recaptcha", { size: "invisible" });
    }
    confirmationResult = null;
    try {
      confirmationResult = await authModule.signInWithPhoneNumber(auth, `+91${phone}`, recaptchaVerifier);
    } catch (error) {
      confirmationResult = null;
      try { recaptchaVerifier?.clear?.(); } catch { /* already cleared */ }
      recaptchaVerifier = null;
      throw error;
    }
  } finally {
    otpSendInProgress = false;
  }
};

export const confirmFirebasePhoneOtp = async (otp: string) => {
  if (!confirmationResult) throw new Error("Please request a fresh OTP first.");
  const credential = await confirmationResult.confirm(otp);
  return credential.user.getIdToken();
};
