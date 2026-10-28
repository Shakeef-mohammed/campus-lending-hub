

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


const itemsGrid = document.getElementById("itemsGrid");
const emptyMessage = document.getElementById("emptyMessage");

const heroSearch = document.getElementById("searchInput");
const itemSearch = document.getElementById("itemSearch");
const categoryFilter = document.getElementById("categoryFilter");

let items = [];
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

function displayItems(list) {
  itemsGrid.replaceChildren();

  if (emptyMessage) {
    emptyMessage.hidden = list.length !== 0;
  }

  list.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item-card";

    const title = document.createElement("h3");
    title.textContent = item.name || "Unnamed item";

    const category = document.createElement("p");
    category.textContent = "Category: " + (item.category || "Other");

    const description = document.createElement("p");
    description.textContent = "Description: " + (item.description || "No description");

    const location = document.createElement("p");
    location.textContent = "Pickup: " + (item.location || "Not specified");

    const owner = document.createElement("p");
    owner.textContent = "Listed by: " + (item.ownerName || "Student");

    const status = document.createElement("p");
    status.textContent = item.available
      ? "Available"
      : "Currently Borrowed";

    const button = document.createElement("button");

    if (!item.available) {
      button.textContent = "Currently Borrowed";
      button.disabled = true;
    } else if (currentUser && currentUser.uid === item.ownerId) {
      button.textContent = "Your Item";
      button.disabled = true;
    } else {
      button.textContent = "Request to Borrow";

      button.addEventListener("click", async () => {
        if (!currentUser) {
          window.location.href = "login.html";
          return;
        }

       
const confirmRequest = confirm(
  `Do you want to request "${item.name}"?`
);

if (!confirmRequest) return;

button.disabled = true;
button.textContent = "Sending...";

try {
  const existingRequests = await getDocs(
    query(
      collection(db, "borrowRequests"),
      where("itemId", "==", item.id),
      where("borrowerId", "==", currentUser.uid),
      where("status", "==", "pending")
    )
  );

  if (!existingRequests.empty) {
    alert("You already have a pending request for this item.");
    return;
  }

  await addDoc(collection(db, "borrowRequests"), {
    itemId: item.id,
    itemName: item.name,
    ownerId: item.ownerId,
    borrowerId: currentUser.uid,
    borrowerName:
      currentUser.displayName ||
      currentUser.email?.split("@")[0] ||
      "Student",
    status: "pending",
    createdAt: serverTimestamp()
  });

  button.textContent = "Request Sent";
  alert("Your borrowing request has been sent!");
} catch (error) {
  console.error("Borrow request error:", error);
  alert("Could not send request. Please try again.");
  button.disabled = false;
  button.textContent = "Request to Borrow";
}

      });
    }

    card.append(
      title,
      category,
      description,
      location,
      owner,
      status,
      button
    );

    itemsGrid.appendChild(card);
  });
}

function applyFilters() {
  const query = (
    (heroSearch?.value || "") + " " +
    (itemSearch?.value || "")
  ).trim().toLowerCase();

  const selectedCategory = categoryFilter?.value || "";

  const filteredItems = items.filter((item) => {
    const searchableText = [
      item.name,
      item.category,
      item.description,
      item.location,
      item.ownerName
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(query);
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  displayItems(filteredItems);
}

function searchItems() {
  if (itemSearch && heroSearch) {
    itemSearch.value = heroSearch.value;
  }

  applyFilters();

  document.getElementById("items")?.scrollIntoView({
    behavior: "smooth"
  });
}

function filterCategory(selectedCategory) {
  if (categoryFilter) {
    categoryFilter.value = selectedCategory;
  }

  if (heroSearch) heroSearch.value = "";
  if (itemSearch) itemSearch.value = "";

  applyFilters();

  document.getElementById("items")?.scrollIntoView({
    behavior: "smooth"
  });
}

window.searchItems = searchItems;
window.filterCategory = filterCategory;

heroSearch?.addEventListener("input", () => {
  if (itemSearch) itemSearch.value = heroSearch.value;
  applyFilters();
});

itemSearch?.addEventListener("input", () => {
  if (heroSearch) heroSearch.value = itemSearch.value;
  applyFilters();
});

categoryFilter?.addEventListener("change", applyFilters);

async function loadItems() {
  itemsGrid.textContent = "Loading campus items...";

  try {
    const snapshot = await getDocs(collection(db, "items"));

    items = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));

    applyFilters();
  } catch (error) {
    console.error("Error loading campus items:", error);

    itemsGrid.textContent =
      "Could not load items. Please refresh and check your connection.";

    if (emptyMessage) emptyMessage.hidden = true;
  }
}

loadItems();
