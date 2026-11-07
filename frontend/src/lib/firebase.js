// Firebase Phone Auth: Firebase sends and checks the SMS code; our backend then verifies the
// Firebase ID token and issues the app's own session (users are stored in MongoDB).
// Config values are public web-app identifiers (safe in the browser), set as Vercel env vars.
const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId);

let authPromise;
// Loaded on demand so visitors who never log in don't download the Firebase SDK.
const getAuthMod = () => {
  if (!authPromise) {
    authPromise = Promise.all([import("firebase/app"), import("firebase/auth")]).then(([appMod, authMod]) => {
      const app = appMod.getApps()[0] || appMod.initializeApp(config);
      const auth = authMod.getAuth(app);
      auth.languageCode = "en";
      return { auth, authMod };
    });
  }
  return authPromise;
};

let verifier = null;

// Sends the SMS. `containerId` is an empty element that hosts the invisible reCAPTCHA.
export async function sendFirebaseOtp(phone10, containerId) {
  const { auth, authMod } = await getAuthMod();
  if (verifier) { try { verifier.clear(); } catch { /* already cleared */ } verifier = null; }
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = "";
  verifier = new authMod.RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return authMod.signInWithPhoneNumber(auth, `+91${phone10}`, verifier);
}

// Checks the code and returns a Firebase ID token for our backend.
export async function confirmFirebaseOtp(confirmation, code) {
  const cred = await confirmation.confirm(code);
  const token = await cred.user.getIdToken();
  const { auth, authMod } = await getAuthMod();
  authMod.signOut(auth).catch(() => {}); // our own session token takes over from here
  return token;
}

const MESSAGES = {
  "auth/invalid-phone-number": "Enter a valid 10-digit mobile number.",
  "auth/missing-phone-number": "Enter your mobile number.",
  "auth/too-many-requests": "Too many attempts from this device. Please wait a while and try again.",
  "auth/quota-exceeded": "We've hit today's SMS limit. Please try again later.",
  "auth/invalid-verification-code": "That code is incorrect. Check the SMS and try again.",
  "auth/code-expired": "That code has expired. Please request a new one.",
  "auth/session-expired": "That code has expired. Please request a new one.",
  "auth/captcha-check-failed": "Security check failed. Please refresh the page and try again.",
  "auth/network-request-failed": "Couldn't reach the login service. Check your connection and try again.",
  "auth/operation-not-allowed": "Phone login isn't enabled yet. Please try again later.",
  "auth/billing-not-enabled": "Phone login isn't enabled yet. Please try again later.",
  "auth/unauthorized-domain": "Login isn't enabled for this website address yet.",
};

export const firebaseErrMsg = (e) => (e?.code && MESSAGES[e.code]) || null;
