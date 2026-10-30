
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const resourceForm = document.getElementById("resourceForm");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");

let currentUser = null;
let userProfile = null;
let authReady = false;

function showMessage(message, type = "error") {
  if (!formMessage) return;

  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
}

function setFormEnabled(enabled) {
  if (!resourceForm) return;

  [...resourceForm.elements].forEach(element => {
    element.disabled = !enabled;
  });
}

async function loadUserProfile(user) {
  const { getDoc, doc } = await import(
    "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js"
  );

  const profileSnapshot = await getDoc(doc(db, "users", user.uid));

  userProfile = profileSnapshot.exists()
    ? profileSnapshot.data()
    : {};
}

onAuthStateChanged(auth, async user => {
  currentUser = user;
  authReady = false;
  setFormEnabled(false);

  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    await user.reload();
    currentUser = auth.currentUser;

    if (!currentUser?.emailVerified) {
      showMessage("Please verify your email before adding a resource.");
      await signOut(auth);
      window.location.replace("login.html");
      return;
    }

    await loadUserProfile(currentUser);

    authReady = true;
    setFormEnabled(true);

  } catch (error) {
    console.error("Authentication/profile error:", error);
    showMessage("Unable to verify your account. Please try again.");
  }
});

resourceForm?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!authReady || !currentUser) {
    showMessage("Please sign in with a verified account first.");
    return;
  }

  const name = document.getElementById("resourceName").value.trim();
  const category = document.getElementById("category").value;
  const condition = document.getElementById("condition").value;
  const description = document.getElementById("description").value.trim();
  const availability = document.getElementById("availability").value;
  const fee = Number(document.getElementById("fee").value);
  const maxDuration = Number(document.getElementById("maxDays").value);
  const location = document.getElementById("location").value.trim();
  const ownershipConfirmed =
    document.getElementById("confirmOwnership").checked;

  if (!name || !category || !condition || !description || !location) {
    showMessage("Please complete all required fields.");
    return;
  }

  if (name.length > 100 || description.length > 1000 || location.length > 150) {
    showMessage("One or more fields exceed the permitted length.");
    return;
  }

  if (!Number.isFinite(fee) || fee < 0 || fee > 1000000) {
    showMessage("Please enter a valid borrowing fee.");
    return;
  }

  if (!Number.isFinite(maxDuration) || maxDuration < 1 || maxDuration > 14) {
    showMessage("Please select a valid borrowing period.");
    return;
  }

  if (!ownershipConfirmed) {
    showMessage("Please confirm that you have permission to list this resource.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Publishing...";

  let savedSuccessfully = false;

  try {
    await currentUser.reload();
    currentUser = auth.currentUser;

    if (!currentUser?.emailVerified) {
      throw new Error("Please verify your email before publishing.");
    }

    const available = availability === "Available";

    await addDoc(collection(db, "items"), {
      name,
      category,
      condition,
      description,
      location,
      fee,
      maxDuration,
      ownerId: currentUser.uid,
      ownerName:
        userProfile?.displayName ||
        currentUser.displayName ||
        currentUser.email ||
        "CampusLend member",
      available,
      activeRequestId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    savedSuccessfully = true;

    showMessage("Resource published successfully!", "success");
    resourceForm.reset();

    window.setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);

  } catch (error) {
    console.error("Resource publishing failed:", error);

    showMessage(
      error.message || "Unable to publish your resource. Please try again."
    );

  } finally {
    if (!savedSuccessfully) {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Resource →";
    }
  }
});
