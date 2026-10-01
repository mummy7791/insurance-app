const firebaseConfig = {
  apiKey: "AIzaSyAVdZx21Nf_BSizmRZEwThZppjez8ACvRU",
  authDomain: "life-insurance-ee3f7.firebaseapp.com",
  projectId: "life-insurance-ee3f7",
  storageBucket: "life-insurance-ee3f7.firebasestorage.app",
  messagingSenderId: "662761285549",
  appId: "1:662761285549:web:825bca6d4f99c9ed44e324",
};

type ConfirmationResultLike = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }>;
};

let confirmationResult: ConfirmationResultLike | null = null;
let recaptchaVerifier: { clear?: () => void } | null = null;

const loadFirebase = async () => {
  const appUrl = "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
  const authUrl = "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
  const appModule = await import(/* @vite-ignore */ appUrl);
  const authModule = await import(/* @vite-ignore */ authUrl);
  const app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(firebaseConfig);
  return { authModule, auth: authModule.getAuth(app) };
};

export const sendFirebasePhoneOtp = async (phone: string) => {
  const { authModule, auth } = await loadFirebase();
  recaptchaVerifier?.clear?.();
  const verifier = new authModule.RecaptchaVerifier(auth, "firebase-recaptcha", { size: "invisible" });
  recaptchaVerifier = verifier;
  confirmationResult = await authModule.signInWithPhoneNumber(auth, `+91${phone}`, verifier);
};

export const confirmFirebasePhoneOtp = async (otp: string) => {
  if (!confirmationResult) throw new Error("Please request a fresh OTP first.");
  const credential = await confirmationResult.confirm(otp);
  return credential.user.getIdToken();
};
