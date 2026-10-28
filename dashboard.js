
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
  serverTimestamp,
  query,
  where,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


const welcomeName = document.getElementById("welcomeName");
const userName = document.getElementById("userName");
const logoutButton = document.getElementById("logoutButton");

const addItemForm = document.getElementById("addItemForm");
const addItemButton = document.getElementById("addItemButton");
const itemFormMessage = document.getElementById("itemFormMessage");
const itemsList = document.getElementById("itemsList");

let currentUser = null;

if (logoutButton) {
  logoutButton.disabled = true;
}

function showMessage(message, isError = false) {
  if (!itemFormMessage) return;

  itemFormMessage.textContent = message;
  itemFormMessage.style.color = isError ? "#b91c1c" : "#087f64";
}

function renderItems(items) {
  if (!itemsList) return;

  itemsList.replaceChildren();

  if (items.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No items listed yet. Be the first to add one!";
    itemsList.appendChild(message);
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

async function loadRequests() {
  const requestsList = document.getElementById("requestsList");

  if (!requestsList || !currentUser) return;

  requestsList.textContent = "Loading requests...";

  try {
    const requestsQuery = query(
      collection(db, "borrowRequests"),
      where("ownerId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(requestsQuery);

    requestsList.replaceChildren();

    if (snapshot.empty) {
      requestsList.textContent = "No borrow requests received yet.";
      return;
    }

    snapshot.forEach((requestDoc) => {
      const request = requestDoc.data();

      const card = document.createElement("article");
      card.className = "item-card";

      const title = document.createElement("h3");
      title.textContent = request.itemName || "Item";

      const borrower = document.createElement("p");
      borrower.textContent =
        "Requested by: " + (request.borrowerName || "Student");

      const status = document.createElement("p");
      status.textContent = "Status: " + request.status;

      card.append(title, borrower, status);

      if (request.status === "pending") {
        const approveButton = document.createElement("button");
        approveButton.textContent = "Approve";

        const rejectButton = document.createElement("button");
        rejectButton.textContent = "Reject";

        approveButton.addEventListener("click", () =>
          updateRequestStatus(requestDoc.id, "approved")
        );

        rejectButton.addEventListener("click", () =>
          updateRequestStatus(requestDoc.id, "rejected")
        );

        card.append(approveButton, rejectButton);
      }

      requestsList.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading requests:", error);
    requestsList.textContent =
      "Could not load requests. Please check Firestore Rules.";
  }
}

async function updateRequestStatus(requestId, newStatus) {
  try {
    await updateDoc(doc(db, "borrowRequests", requestId), {
      status: newStatus
    });

    alert("Request " + newStatus + " successfully!");
    await loadRequests();
  } catch (error) {
    console.error("Error updating request:", error);
    alert("Could not update request. Please check Firestore Rules.");
  }
}


async function loadItems() {
  if (!itemsList) return;

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
    itemsList.textContent = "Could not load items. Please refresh and try again.";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;

  const displayName =
    user.displayName || user.email?.split("@")[0] || "Student";

  if (welcomeName) welcomeName.textContent = displayName;
  if (userName) userName.textContent = displayName;

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

  if (logoutButton) logoutButton.disabled = false;

  await loadItems();
  await loadRequests();
});

if (addItemForm) {
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

    if (addItemButton) addItemButton.disabled = true;
    showMessage("Saving your item...");

    try {
      await addDoc(collection(db, "items"), {
        name,
        category,
        description,
        location,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName ||
          currentUser.email?.split("@")[0] || "Student",
        available: true,
        createdAt: serverTimestamp()
      });

      addItemForm.reset();
      showMessage("Item added successfully!");
      await loadItems();
    } catch (error) {
      console.error("Error adding item:", error);
      showMessage("Could not add item. Check the Firestore Rules and internet connection.", true);
    } finally {
      if (addItemButton) addItemButton.disabled = false;
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      await signOut(auth);
      window.location.replace("login.html");
    } catch (error) {
      logoutButton.disabled = false;
      alert("Could not log out. Please try again.");
    }
  });
}
