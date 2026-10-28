import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const message = document.getElementById("message");
const submitButton = loginForm.querySelector('button[type="submit"]');

function showMessage(text, isError = true) {
  message.style.color = isError ? "#b42318" : "#187b57";
  message.textContent = text;
}

function friendlyError(error) {
  const codes = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account found with this email. Please register first.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/operation-not-allowed": "Email/Password sign-in is not enabled in Firebase yet.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication settings."
  };
  return codes[error.code] || "Could not sign in. Please check your details and try again.";
}

togglePassword.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePassword.textContent = isHidden ? "Hide" : "Show";
});

// If a student is already signed in, take them straight to the dashboard.
onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace("dashboard.html");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;
  const remember = document.getElementById("remember").checked;

  if (!email || !password) {
    showMessage("Please fill in your email and password.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Signing in…";
  showMessage("Checking your account…", false);

  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    showMessage("Login successful. Opening your dashboard…", false);
    window.location.replace("dashboard.html");
  } catch (error) {
    showMessage(friendlyError(error));
    submitButton.disabled = false;
    submitButton.textContent = "Sign In →";
  }
});

document.getElementById("forgotLink").addEventListener("click", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (!email) {
    showMessage("Enter your email address first, then click Forgot password?.");
    document.getElementById("email").focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("If an account exists for this email, a password reset email has been sent. Check your inbox and spam folder.", false);
  } catch (error) {
    showMessage(friendlyError(error));
  }
});
