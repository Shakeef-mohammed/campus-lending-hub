import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const welcomeName = document.getElementById("welcomeName");
const userName = document.getElementById("userName");
const logoutButton = document.getElementById("logoutButton");

logoutButton.disabled = true;
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  const displayName = (user.displayName || user.email?.split("@")[0] || "Student")
    .split(" ").filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  welcomeName.textContent = displayName;
  userName.textContent = displayName;
  logoutButton.disabled = false;
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out…";
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    logoutButton.disabled = false;
    logoutButton.textContent = "Logout";
    alert("Could not log out. Please check your connection and try again.");
  }
});


