
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const welcomeName = document.getElementById("welcomeName");
const userName = document.getElementById("userName");
const logoutButton = document.getElementById("logoutButton");

const addItemForm = document.getElementById("addItemForm");
const addItemButton = document.getElementById("addItemButton");
const itemFormMessage = document.getElementById("itemFormMessage");
const itemsList = document.getElementById("itemsList");

let currentUser = null;

logoutButton.disabled = true;

function showMessage(message, isError = false) {
  itemFormMessage.textContent = message;
  itemFormMessage.style.color = isError ? "#b91c1c" : "#087f64";
}

function renderItems(items) {
  itemsList.replaceChildren();

  if (items.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "No items listed yet. Be the first to add one!";
    itemsList.appendChild(emptyMessage);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";

    const title = document.createElement("h3");
    title.textContent = item.name || "Unnamed item";

    const category = document.createElement("p");
    category.textContent = `Category: ${item.category || "Other"}`;

    const description = document.createElement("p");
    description.textContent = item.description || "No description";

    const location = document.createElement("p");
    location.textContent = `Pickup: ${item.location || "Not specified"}`;

    const owner = document.createElement("p");
    owner.textContent = `Listed by: ${item.ownerName || "Student"}`;

    const status = document.createElement("p");
    status.textContent = item.available ? "Available" : "Not available";

    card.append(title, category, description, location, owner, status);
    itemsList.appendChild(card);
  });
}

async function loadItems() {
  itemsList.textContent = "Loading items...";

  try {
    const snapshot = await getDocs(collection(db, "items"));

    const items = snapshot.docs.map((itemDoc) => ({
      id: itemDoc.id,
      ...itemDoc.data()
    }));

    renderItems(items);
  } catch (error) {
    console.error("Could not load items:", error);
    itemsList.textContent =
      "Could not load items. Please refresh and try again.";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;

  const displayName =
    (user.displayName || user.email?.split("@")[0] || "Student")
      .split(" ")
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  welcomeName.textContent = displayName;
  userName.textContent = displayName;

  try {
    const profileRef = doc(db, "users", user.uid);
    const profileSnapshot = await getDoc(profileRef);

    if (!profileSnapshot.exists()) {
      await setDoc(profileRef, {
        uid: user.uid,
        displayName,
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(profileRef, {
        uid: user.uid,
        displayName,
        email: user.email,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Profile save failed:", error);
  }

  logoutButton.disabled = false;
  await loadItems();
});

addItemForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage("Please log in before adding an item.", true);
    return;
  }

  const name = document.getElementById("itemName").value.trim();
  const category = document.getElementById("itemCategory").value;
  const description = document.getElementById("itemDescription").value.trim();
  const location = document.getElementById("itemLocation").value.trim();

  if (!name || !category || !description || !location) {
    showMessage("Please complete all fields.", true);
    return;
  }

  addItemButton.disabled = true;
  showMessage("Saving your item...");

  try {
    await addDoc(collection(db, "items"), {
      name,
      category,
      description,
      location,
      ownerId: currentUser.uid,
      ownerName:
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "Student",
      available: true,
      createdAt: serverTimestamp()
    });

    addItemForm.reset();
    showMessage("Item added successfully!");
    await loadItems();
  } catch (error) {
    console.error("Error adding item:", error);
    showMessage(
      "Could not add item. Check your internet and Firestore Rules.",
      true
    );
  } finally {
    addItemButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out...";

  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    logoutButton.disabled = false;
    logoutButton.textContent = "Logout";
    alert("Could not log out. Please check your connection and try again.");
  }
});
