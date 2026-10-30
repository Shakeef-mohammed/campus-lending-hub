
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const itemsGrid = document.getElementById("itemsGrid");
const emptyMessage = document.getElementById("emptyMessage");
const searchInput = document.getElementById("itemSearch");
const categoryFilter = document.getElementById("categoryFilter");

let currentUser = null;
let allItems = [];

const categoryIcons = {
  Books: "📚",
  Textbooks: "📚",
  Electronics: "💻",
  Calculators: "🧮",
  Photography: "📷",
  Cameras: "📷",
  Sports: "⚽",
  "Sports Equipment": "⚽",
  Tools: "🛠️",
  Stationery: "✏️",
  Accessories: "🎒",
  Other: "📦"
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function getCategoryIcon(category) {
  return categoryIcons[category] || "📦";
}

function showMessage(message, type = "info") {
  let element = document.getElementById("homeMessage");

  if (!element) {
    element = document.createElement("div");
    element.id = "homeMessage";

    if (itemsGrid?.parentElement) {
      itemsGrid.parentElement.prepend(element);
    }
  }

  element.textContent = message;
  element.className = `home-message ${type}`;
}

function formatFee(fee) {
  const amount = Number(fee || 0);

  return amount <= 0
    ? "Free"
    : `Rs. ${amount.toLocaleString("en-LK")}`;
}

function renderItems(items) {
  if (!itemsGrid) return;

  itemsGrid.innerHTML = "";

  if (items.length === 0) {
    if (emptyMessage) {
      emptyMessage.style.display = "block";
    }
    return;
  }

  if (emptyMessage) {
    emptyMessage.style.display = "none";
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "item-card";

    const icon = getCategoryIcon(item.category);

    card.innerHTML = `
      <div class="item-image">
        <span>${icon}</span>
      </div>

      <div class="item-content">
        <span class="item-category">
          ${escapeHTML(item.category || "Other")}
        </span>

        <h3>${escapeHTML(item.name || "Untitled item")}</h3>

        <p>${escapeHTML(item.description || "No description available.")}</p>

        <div class="item-meta">
          <span>📍 ${escapeHTML(item.location || "Location not specified")}</span>
          <span>💰 ${formatFee(item.fee)}</span>
        </div>

        <p class="item-owner">
          Owner: ${escapeHTML(item.ownerName || "CampusShare member")}
        </p>

        <button
          class="borrow-btn"
          data-item-id="${escapeHTML(item.id)}"
          type="button"
        >
          Request to Borrow
        </button>
      </div>
    `;

    itemsGrid.appendChild(card);
  });
}

function applyFilters() {
  const searchTerm = (searchInput?.value || "")
    .trim()
    .toLowerCase();

  const selectedCategory = categoryFilter?.value || "all";

  const filteredItems = allItems.filter(item => {
    const matchesSearch = [
      item.name,
      item.description,
      item.category,
      item.location,
      item.ownerName
    ].some(value =>
      String(value || "").toLowerCase().includes(searchTerm)
    );

    const matchesCategory =
      selectedCategory === "all" ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  renderItems(filteredItems);
}

async function loadItems() {
  if (!itemsGrid) return;

  itemsGrid.innerHTML = "<p>Loading available items...</p>";

  try {
    const itemsQuery = query(
      collection(db, "items"),
      where("available", "==", true)
    );

    const snapshot = await getDocs(itemsQuery);

    allItems = snapshot.docs
      .map(itemDoc => ({
        id: itemDoc.id,
        ...itemDoc.data()
      }))
      .filter(item => !item.activeRequestId)
      .sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });

    applyFilters();

  } catch (error) {
    console.error("Loading items failed:", error);

    itemsGrid.innerHTML =
      "<p>Unable to load items. Please refresh the page.</p>";
  }
}

async function createBorrowRequest(itemId, button) {
  if (!currentUser) {
    showMessage("Please sign in before requesting an item.", "error");
    window.location.href = "login.html";
    return;
  }

  try {
    await currentUser.reload();
    currentUser = auth.currentUser;

    if (!currentUser?.emailVerified) {
      showMessage(
        "Please verify your email before requesting an item.",
        "error"
      );

      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    button.disabled = true;
    button.textContent = "Sending request...";

    const itemRef = doc(db, "items", itemId);
    const requestRef = doc(collection(db, "borrowRequests"));

    await runTransaction(db, async transaction => {
      const itemSnapshot = await transaction.get(itemRef);

      if (!itemSnapshot.exists()) {
        throw new Error("This item no longer exists.");
      }

      const item = itemSnapshot.data();

      if (item.ownerId === currentUser.uid) {
        throw new Error("You cannot borrow your own item.");
      }

      if (item.available !== true || item.activeRequestId) {
        throw new Error("This item is no longer available.");
      }

      transaction.set(requestRef, {
        itemId,
        itemName: item.name || "",
        ownerId: item.ownerId,
        ownerName: item.ownerName || "",
        borrowerId: currentUser.uid,
        borrowerName:
          currentUser.displayName ||
          currentUser.email ||
          "CampusShare member",
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      transaction.update(itemRef, {
        available: false,
        activeRequestId: requestRef.id,
        updatedAt: serverTimestamp()
      });
    });

    showMessage(
      "Your borrow request has been sent successfully!",
      "success"
    );

    await loadItems();

  } catch (error) {
    console.error("Borrow request failed:", error);

    showMessage(
      error.message || "Unable to send your request.",
      "error"
    );

  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = "Request to Borrow";
    }
  }
}

itemsGrid?.addEventListener("click", event => {
  const button = event.target.closest(".borrow-btn");

  if (!button) return;

  const itemId = button.dataset.itemId;

  if (!itemId) return;

  createBorrowRequest(itemId, button);
});

searchInput?.addEventListener("input", applyFilters);
categoryFilter?.addEventListener("change", applyFilters);

window.searchItems = function () {
  applyFilters();

  document.getElementById("items")?.scrollIntoView({
    behavior: "smooth"
  });
};

window.filterCategory = function (category) {
  if (categoryFilter) {
    const matchingOption = [...categoryFilter.options].find(option =>
      option.value.toLowerCase() === category.toLowerCase() ||
      option.textContent.toLowerCase() === category.toLowerCase()
    );

    categoryFilter.value = matchingOption?.value || category;
  }

  applyFilters();

  document.getElementById("items")?.scrollIntoView({
    behavior: "smooth"
  });
};

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (user) {
    try {
      await user.reload();
      currentUser = auth.currentUser;
    } catch (error) {
      console.error("User reload failed:", error);
    }
  }

  await loadItems();
});

