import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("message");
const button = form.querySelector('button[type="submit"]');

function showMessage(text, isError = true) {
  message.style.color = isError ? "#b42318" : "#187b57";
  message.textContent = text;
}

function friendlyError(error) {
  const codes = {
    "auth/email-already-in-use": "An account with this email already exists. Please sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
    "auth/operation-not-allowed": "Email/Password sign-in is not enabled in Firebase yet.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication settings."
  };
  return codes[error.code] || "Could not create your account. Please check your details and try again.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (fullName.length < 2) {
    showMessage("Please enter your full name.");
    return;
  }
  if (password !== confirmPassword) {
    showMessage("The passwords do not match. Please try again.");
    return;
  }
  if (password.length < 6) {
    showMessage("Your password must be at least 6 characters long.");
    return;
  }

  button.disabled = true;
  button.textContent = "Creating account…";
  showMessage("Creating your CampusShare account…", false);

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: fullName });
    showMessage("Account created successfully! Opening your dashboard…", false);
    window.location.replace("dashboard.html");
  } catch (error) {
    showMessage(friendlyError(error));
    button.disabled = false;
    button.textContent = "Create Account →";
  }
});
