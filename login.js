
import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  reload
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";


// HTML Elements

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");
const message = document.getElementById("message");

const submitButton = document.getElementById("loginButton");
const verificationPanel = document.getElementById("verificationPanel");

const resendButton = document.getElementById("resendVerification");
const checkButton = document.getElementById("checkVerification");

const forgotLink = document.getElementById("forgotLink");


// Display message

function showMessage(text, isError = true) {
  message.style.color = isError ? "#b42318" : "#187b57";
  message.textContent = text;
}


// Friendly Firebase errors

function friendlyError(error) {

  const codes = {

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/user-not-found":
      "No account found with this email. Please register first.",

    "auth/wrong-password":
      "Email or password is incorrect.",

    "auth/email-already-in-use":
      "This email is already registered.",

    "auth/too-many-requests":
      "Too many attempts. Please wait and try again.",

    "auth/network-request-failed":
      "Network error. Check your internet connection.",

    "auth/operation-not-allowed":
      "Email/Password sign-in is not enabled in Firebase.",

    "auth/unauthorized-domain":
      "This website domain is not authorized in Firebase Authentication settings.",

    "auth/requires-recent-login":
      "Please sign in again before performing this action."

  };

  return codes[error.code] ||
    error.message ||
    "Something went wrong. Please try again.";
}


// Show / Hide password

togglePassword.addEventListener("click", () => {

  const isHidden = passwordInput.type === "password";

  passwordInput.type = isHidden ? "text" : "password";

  togglePassword.textContent = isHidden ? "Hide" : "Show";

  togglePassword.setAttribute(
    "aria-label",
    isHidden ? "Hide password" : "Show password"
  );

});


// Authentication state listener

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    verificationPanel.style.display = "none";
    return;
  }

  try {

    await reload(user);

    if (user.emailVerified) {

      showMessage(
        "Email verified. Opening your dashboard...",
        false
      );

      window.location.replace("dashboard.html");

    } else {

      verificationPanel.style.display = "block";

      showMessage(
        "Your email is not verified yet. Please verify your email to continue.",
        true
      );

    }

  } catch (error) {

    console.error("Authentication state error:", error);

    showMessage(friendlyError(error));

  }

});


// Login form

loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const email = emailInput.value.trim().toLowerCase();

  const password = passwordInput.value;

  const remember = document.getElementById("remember").checked;


  // Validate inputs

  if (!email || !password) {

    showMessage("Please enter your email and password.");

    return;

  }


  submitButton.disabled = true;

  submitButton.textContent = "Signing in...";

  verificationPanel.style.display = "none";

  showMessage("Checking your account...", false);


  try {

    // Set login persistence

    await setPersistence(
      auth,
      remember
        ? browserLocalPersistence
        : browserSessionPersistence
    );


    // Sign in

    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = credential.user;


    // Refresh verification status

    await reload(user);


    // Check email verification

    if (!user.emailVerified) {

      verificationPanel.style.display = "block";

      showMessage(
        "Your account is registered, but your email is not verified. Please verify it before accessing CampusShare.",
        true
      );

      return;

    }


    // Verified user

    showMessage(
      "Login successful. Opening your dashboard...",
      false
    );

    window.location.replace("dashboard.html");


  } catch (error) {

    console.error("Login error:", error);

    showMessage(friendlyError(error));

  } finally {

    submitButton.disabled = false;

    submitButton.textContent = "Sign In →";

  }

});


// Resend verification email

resendButton.addEventListener("click", async () => {

  const user = auth.currentUser;

  if (!user) {

    showMessage(
      "Please sign in first to resend the verification email."
    );

    return;

  }


  resendButton.disabled = true;

  resendButton.textContent = "Sending...";


  try {

    await reload(user);

    if (user.emailVerified) {

      showMessage(
        "Your email is already verified. Opening dashboard...",
        false
      );

      window.location.replace("dashboard.html");

      return;

    }


    await sendEmailVerification(user);


    showMessage(
      "A new verification email has been sent. Please check your inbox and Spam folder.",
      false
    );


  } catch (error) {

    console.error("Resend verification error:", error);

    showMessage(friendlyError(error));

  } finally {

    resendButton.disabled = false;

    resendButton.textContent = "Resend verification email";

  }

});


// Check whether email has been verified

checkButton.addEventListener("click", async () => {

  const user = auth.currentUser;

  if (!user) {

    showMessage(
      "Your login session has expired. Please sign in again."
    );

    return;

  }


  checkButton.disabled = true;

  checkButton.textContent = "Checking...";


  try {

    await reload(user);

    if (user.emailVerified) {

      verificationPanel.style.display = "none";

      showMessage(
        "Email verified successfully! Opening your dashboard...",
        false
      );

      window.location.replace("dashboard.html");

    } else {

      showMessage(
        "Your email is still not verified. Please open the latest verification email and click its link.",
        true
      );

    }

  } catch (error) {

    console.error("Verification check error:", error);

    showMessage(friendlyError(error));

  } finally {

    checkButton.disabled = false;

    checkButton.textContent = "I have verified – Check again";

  }

});


// Forgot password

forgotLink.addEventListener("click", async (event) => {

  event.preventDefault();

  const email = emailInput.value.trim().toLowerCase();


  if (!email) {

    showMessage(
      "Enter your email address first, then click Forgot password?."
    );

    emailInput.focus();

    return;

  }


  try {

    await sendPasswordResetEmail(auth, email);

    showMessage(
      "If an account exists for this email, a password reset email has been sent. Check your inbox and Spam folder.",
      false
    );

  } catch (error) {

    console.error("Password reset error:", error);

    showMessage(friendlyError(error));

  }

});
