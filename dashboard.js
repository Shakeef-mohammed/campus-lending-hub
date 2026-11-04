import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


/* =========================================
   1. GLOBAL VARIABLES
========================================= */

let currentUser = null;
let currentUserName = "Student";
let currentProfile = {};

let authReadyResolve;

const authStateReady = new Promise((resolve) => {
  authReadyResolve = resolve;
});


/* =========================================
   2. DOM ELEMENTS
========================================= */

const logoutButton = document.getElementById("logoutButton");

const addItemForm = document.getElementById("addItemForm");
const itemFormMessage = document.getElementById("itemFormMessage");
const addItemButton = document.getElementById("addItemButton");

const requestsList = document.getElementById("requestsList");
const itemsList = document.getElementById("itemsList");
const myRequestsList = document.getElementById("myRequestsList");
const myBorrowingsList = document.getElementById("myBorrowingsList");
const historyList = document.getElementById("historyList");


/* =========================================
   3. GENERAL HELPER FUNCTIONS
========================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const characters = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return characters[character];
  });
}


function showMessage(element, message, type = "success") {
  if (!element) return;

  element.textContent = message;
  element.className = `message ${type}`;
}


function setButtonLoading(button, loading, loadingText = "Please wait...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}


function formatDate(value) {
  if (!value) return "Not available";

  let date;

  if (typeof value.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


function getTimestamp(value) {
  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}


function formatStatus(status) {
  const labels = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    returned: "Returned",
    return_requested: "Return Requested"
  };

  return labels[status] || status || "Unknown";
}


function statusClass(status) {
  const classes = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    returned: "returned",
    return_requested: "pending"
  };

  return classes[status] || "pending";
}


function getItemIcon(category) {
  const icons = {
    textbooks: "📚",
    books: "📚",
    calculators: "🧮",
    laptops: "💻",
    electronics: "💻",
    cameras: "📷",
    photography: "📷",
    sports: "⚽",
    "sports equipment": "⚽",
    accessories: "🎒",
    tools: "🛠️",
    stationery: "✏️",
    other: "📦"
  };

  return icons[String(category || "").toLowerCase()] || "📦";
}


function createChatLink(requestId) {
  return `
    <a class="btn btn-secondary"
       href="chat.html?requestId=${encodeURIComponent(requestId)}">
       Open Chat
    </a>
  `;
}


function showEmptyMessage(element, message) {
  if (!element) return;

  element.innerHTML = `
    <div class="empty-state">
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}


/* =========================================
   4. NAVIGATION
========================================= */

const navLinks = document.querySelectorAll("[data-section]");
const dashboardSections = document.querySelectorAll(".dashboard-section");


function showSection(sectionId) {
  dashboardSections.forEach((section) => {
    section.classList.toggle("active", section.id === sectionId);
  });

  navLinks.forEach((link) => {
    link.classList.toggle(
      "active",
      link.dataset.section === sectionId
    );
  });
}


navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const sectionId = link.dataset.section;

    if (sectionId) {
      showSection(sectionId);
    }
  });
});


/* =========================================
   5. LOAD USER PROFILE
========================================= */

async function loadUserProfile() {
  if (!currentUser) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      currentProfile = userSnapshot.data();

      currentUserName =
        currentProfile.name ||
        currentUser.displayName ||
        "Student";
    } else {
      currentProfile = {};

      currentUserName =
        currentUser.displayName || "Student";
    }

    const nameElements = document.querySelectorAll(".user-name");

    nameElements.forEach((element) => {
      element.textContent = currentUserName;
    });

  } catch (error) {
    console.error("Load profile error:", error);
  }
}


/* =========================================
   6. UPDATE USER PROFILE
========================================= */

const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");


if (profileForm) {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    const name =
      document.getElementById("profileName")?.value.trim();

    if (!name) {
      showMessage(
        profileMessage,
        "Please enter your name.",
        "error"
      );
      return;
    }

    try {
      const profileButton =
        profileForm.querySelector('button[type="submit"]');

      setButtonLoading(profileButton, true, "Updating...");

      await updateProfile(currentUser, {
        displayName: name
      });

      await updateDoc(doc(db, "users", currentUser.uid), {
        name,
        updatedAt: serverTimestamp()
      });

      currentUserName = name;

      document.querySelectorAll(".user-name").forEach((element) => {
        element.textContent = name;
      });

      showMessage(
        profileMessage,
        "Profile updated successfully!",
        "success"
      );

    } catch (error) {
      console.error("Profile update error:", error);

      showMessage(
        profileMessage,
        error.message || "Unable to update profile.",
        "error"
      );

    } finally {
      const profileButton =
        profileForm.querySelector('button[type="submit"]');

      setButtonLoading(profileButton, false);
    }
  });
}


/* =========================================
   7. LOAD RECEIVED BORROW REQUESTS
========================================= */

async function loadReceivedRequests() {
  if (!currentUser || !requestsList) return;

  try {
    const requestsQuery = query(
      collection(db, "borrowRequests"),
      where("ownerId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(requestsQuery);

    const requests = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));

    const pendingRequests = requests.filter(
      (request) => request.status === "pending"
    );

    if (pendingRequests.length === 0) {
      showEmptyMessage(
        requestsList,
        "You have no pending borrow requests."
      );
      return;
    }

    requestsList.innerHTML = pendingRequests.map((request) => {
      return `
        <div class="request-card">
          <div class="request-card-header">
            <h3>${escapeHTML(request.itemName || "Resource")}</h3>

            <span class="status-badge pending">
              Pending
            </span>
          </div>

          <p><strong>Borrower:</strong>
            ${escapeHTML(request.borrowerName || "Student")}
          </p>

          <p><strong>Start Date:</strong>
            ${formatDate(request.startDate)}
          </p>

          <p><strong>End Date:</strong>
            ${formatDate(request.endDate)}
          </p>

          <div class="card-actions">
            ${createChatLink(request.id)}

            <button class="btn btn-primary"
                    data-action="approve"
                    data-request-id="${escapeHTML(request.id)}">
              Accept
            </button>

            <button class="btn btn-danger"
                    data-action="reject"
                    data-request-id="${escapeHTML(request.id)}">
              Reject
            </button>
          </div>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Received requests error:", error);

    showEmptyMessage(
      requestsList,
      "Unable to load received requests."
    );
  }
}


/* =========================================
   8. APPROVE BORROW REQUEST
========================================= */

async function approveRequest(requestId) {
  if (!currentUser) return;

  try {
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, "borrowRequests", requestId);
      const requestSnapshot = await transaction.get(requestRef);

      if (!requestSnapshot.exists()) {
        throw new Error("Request not found.");
      }

      const request = requestSnapshot.data();

      if (request.ownerId !== currentUser.uid) {
        throw new Error("You are not allowed to approve this request.");
      }

      if (request.status !== "pending") {
        throw new Error("This request is no longer pending.");
      }

      const itemRef = doc(db, "items", request.itemId);
      const itemSnapshot = await transaction.get(itemRef);

      if (!itemSnapshot.exists()) {
        throw new Error("Resource not found.");
      }

      const item = itemSnapshot.data();

      if (!item.available || item.isArchived) {
        throw new Error("This resource is not available.");
      }

      transaction.update(requestRef, {
        status: "approved",
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      transaction.update(itemRef, {
        available: false,
        activeRequestId: requestId,
        updatedAt: serverTimestamp()
      });
    });

    alert("Borrow request approved successfully!");

    await refreshDashboard();

  } catch (error) {
    console.error("Approve request error:", error);
    alert(error.message || "Unable to approve request.");
  }
}


/* =========================================
   9. REJECT BORROW REQUEST
========================================= */

async function rejectRequest(requestId) {
  if (!currentUser) return;

  const confirmed = confirm(
    "Are you sure you want to reject this borrow request?"
  );

  if (!confirmed) return;

  try {
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, "borrowRequests", requestId);
      const requestSnapshot = await transaction.get(requestRef);

      if (!requestSnapshot.exists()) {
        throw new Error("Request not found.");
      }

      const request = requestSnapshot.data();

      if (request.ownerId !== currentUser.uid) {
        throw new Error("You are not allowed to reject this request.");
      }

      if (request.status !== "pending") {
        throw new Error("This request is no longer pending.");
      }

      transaction.update(requestRef, {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    alert("Borrow request rejected.");

    await refreshDashboard();

  } catch (error) {
    console.error("Reject request error:", error);
    alert(error.message || "Unable to reject request.");
  }
}


/* =========================================
   10. LOAD MY ITEMS
========================================= */

async function loadMyItems() {
  if (!currentUser || !itemsList) return;

  try {
    const itemsQuery = query(
      collection(db, "items"),
      where("ownerId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(itemsQuery);

    const items = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));

    if (items.length === 0) {
      showEmptyMessage(
        itemsList,
        "You have not added any resources yet."
      );
      return;
    }

    itemsList.innerHTML = items.map((item) => {
      const availability = item.available
        ? "Available"
        : "Unavailable";

      return `
        <div class="item-card">
          <div class="item-icon">
            ${getItemIcon(item.category)}
          </div>

          <div class="item-details">
            <h3>${escapeHTML(item.name || "Resource")}</h3>

            <p><strong>Category:</strong>
              ${escapeHTML(item.category || "Other")}
            </p>

            <p><strong>Condition:</strong>
              ${escapeHTML(item.condition || "Good")}
            </p>

            <p><strong>Location:</strong>
              ${escapeHTML(item.location || "Not specified")}
            </p>

            <p><strong>Fee:</strong>
              ${escapeHTML(item.fee ?? 0)}
            </p>

            <p><strong>Maximum Duration:</strong>
              ${escapeHTML(item.maxDuration ?? 0)} days
            </p>

            <p><strong>Status:</strong>
              ${availability}
            </p>

            <p>${escapeHTML(item.description || "")}</p>

            <div class="card-actions">
              ${
                item.isArchived
                  ? `<span class="status-badge pending">Archived</span>`
                  : `
                    <button class="btn btn-danger"
                            data-action="archive-item"
                            data-item-id="${escapeHTML(item.id)}">
                      Archive Resource
                    </button>
                  `
              }
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Load my items error:", error);

    showEmptyMessage(
      itemsList,
      "Unable to load your resources."
    );
  }
}


/* =========================================
   11. LOAD MY BORROW REQUESTS
========================================= */

async function loadMyRequests() {
  if (!currentUser || !myRequestsList) return;

  try {
    const requestsQuery = query(
      collection(db, "borrowRequests"),
      where("borrowerId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(requestsQuery);

    const requests = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));

    requests.sort(
      (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
    );

    myRequestsList.innerHTML = requests.map((request) => {
      const status = request.status || "pending";

      return `
        <div class="request-card">
          <div class="request-card-header">
            <h3>${escapeHTML(request.itemName || "Resource")}</h3>

            <span class="status-badge ${statusClass(status)}">
              ${escapeHTML(formatStatus(status))}
            </span>
          </div>

          <p><strong>Owner:</strong>
            ${escapeHTML(request.ownerName || "Student")}
          </p>

          <p><strong>Start Date:</strong> ${formatDate(request.startDate)}</p>
          <p><strong>End Date:</strong> ${formatDate(request.endDate)}</p>

          <div class="card-actions">
            ${createChatLink(request.id)}
          </div>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("My requests error:", error);

    showEmptyMessage(
      myRequestsList,
      "Unable to load your borrow requests."
    );
  }
}


/* =========================================
   12. LOAD MY CURRENT BORROWINGS
========================================= */

async function loadMyBorrowings() {
  if (!currentUser || !myBorrowingsList) return;

  try {
    const requestsQuery = query(
      collection(db, "borrowRequests"),
      where("borrowerId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(requestsQuery);

    const borrowings = snapshot.docs
      .map((document) => ({
        id: document.id,
        ...document.data()
      }))
      .filter((request) => {
        return [
          "approved",
          "return_requested"
        ].includes(request.status);
      });

    if (borrowings.length === 0) {
      showEmptyMessage(
        myBorrowingsList,
        "You do not have any active borrowings."
      );
      return;
    }

    myBorrowingsList.innerHTML = borrowings.map((request) => {
      const status = request.status;

      let returnButton = "";

      if (status === "approved") {
        returnButton = `
          <button class="btn btn-primary"
                  data-action="request-return"
                  data-request-id="${escapeHTML(request.id)}">
            Request Return
          </button>
        `;
      } else {
        returnButton = `
          <span class="status-badge pending">
            Waiting for owner confirmation
          </span>
        `;
      }

      return `
        <div class="request-card">
          <div class="request-card-header">
            <h3>${escapeHTML(request.itemName || "Resource")}</h3>

            <span class="status-badge ${statusClass(status)}">
              ${escapeHTML(formatStatus(status))}
            </span>
          </div>

          <p><strong>Owner:</strong>
            ${escapeHTML(request.ownerName || "Student")}
          </p>

          <p><strong>Return Date:</strong> ${formatDate(request.endDate)}</p>

          <div class="card-actions">
            ${createChatLink(request.id)}
            ${returnButton}
          </div>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("My borrowings error:", error);

    showEmptyMessage(
      myBorrowingsList,
      "Unable to load your borrowings."
    );
  }
}


/* =========================================
   13. REQUEST RETURN
========================================= */

async function requestReturn(requestId) {
  if (!currentUser) return;

  const confirmed = confirm(
    "Do you want to request the return of this resource?"
  );

  if (!confirmed) return;

  try {
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, "borrowRequests", requestId);
      const requestSnapshot = await transaction.get(requestRef);

      if (!requestSnapshot.exists()) {
        throw new Error("Borrow request not found.");
      }

      const request = requestSnapshot.data();

      if (request.borrowerId !== currentUser.uid) {
        throw new Error("You are not allowed to update this request.");
      }

      if (request.status !== "approved") {
        throw new Error("This borrowing cannot be returned now.");
      }

      transaction.update(requestRef, {
        status: "return_requested",
        returnRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    alert("Return request sent to the resource owner.");

    await refreshDashboard();

  } catch (error) {
    console.error("Request return error:", error);
    alert(error.message || "Unable to request return.");
  }
}


/* =========================================
   14. CONFIRM RESOURCE RETURN
========================================= */

async function confirmReturn(requestId) {
  if (!currentUser) return;

  const confirmed = confirm(
    "Has the resource been returned successfully?"
  );

  if (!confirmed) return;

  try {
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, "borrowRequests", requestId);
      const requestSnapshot = await transaction.get(requestRef);

      if (!requestSnapshot.exists()) {
        throw new Error("Borrow request not found.");
      }

      const request = requestSnapshot.data();

      if (request.ownerId !== currentUser.uid) {
        throw new Error("You are not allowed to confirm this return.");
      }

      if (request.status !== "return_requested") {
        throw new Error("This return request is not ready for confirmation.");
      }

      const itemRef = doc(db, "items", request.itemId);
      const itemSnapshot = await transaction.get(itemRef);

      if (!itemSnapshot.exists()) {
        throw new Error("Resource not found.");
      }

      transaction.update(requestRef, {
        status: "returned",
        returnedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      transaction.update(itemRef, {
        available: true,
        activeRequestId: null,
        updatedAt: serverTimestamp()
      });
    });

    alert("Resource return confirmed.");

    await refreshDashboard();

  } catch (error) {
    console.error("Confirm return error:", error);
    alert(error.message || "Unable to confirm return.");
  }
}


/* =========================================
   15. ARCHIVE RESOURCE
========================================= */

async function archiveItem(itemId) {
  if (!currentUser) return;

  const confirmed = confirm(
    "Are you sure you want to archive this resource?"
  );

  if (!confirmed) return;

  try {
    const itemRef = doc(db, "items", itemId);
    const itemSnapshot = await getDoc(itemRef);

    if (!itemSnapshot.exists()) {
      throw new Error("Resource not found.");
    }

    const item = itemSnapshot.data();

    if (item.ownerId !== currentUser.uid) {
      throw new Error("You are not allowed to archive this resource.");
    }

    if (item.available === false) {
      throw new Error(
        "This resource cannot be archived while it is borrowed."
      );
    }

    await updateDoc(itemRef, {
      isArchived: true,
      updatedAt: serverTimestamp()
    });

    alert("Resource archived successfully.");

    await refreshDashboard();

  } catch (error) {
    console.error("Archive item error:", error);
    alert(error.message || "Unable to archive resource.");
  }
}


/* =========================================
   16. ADD NEW RESOURCE
========================================= */

async function handleAddItem(event) {
  event.preventDefault();

  if (!currentUser) {
    showMessage(
      itemFormMessage,
      "Please log in to add a resource.",
      "error"
    );
    return;
  }

  if (!currentUser.emailVerified) {
    showMessage(
      itemFormMessage,
      "Please verify your email before adding a resource.",
      "error"
    );
    return;
  }

  const name = document.getElementById("itemName")?.value.trim();
  const category = document.getElementById("itemCategory")?.value;
  const condition = document.getElementById("itemCondition")?.value;
  const description = document.getElementById("itemDescription")?.value.trim();
  const availability = document.getElementById("itemAvailability")?.value;
  const feeValue = document.getElementById("itemFee")?.value;
  const maxDaysValue = document.getElementById("itemMaxDays")?.value;
  const location = document.getElementById("itemLocation")?.value.trim();
  const ownershipConfirmed =
    document.getElementById("itemConfirmOwnership")?.checked;

  if (
    !name ||
    !category ||
    !condition ||
    !description ||
    !availability ||
    feeValue === undefined ||
    feeValue === null ||
    feeValue === "" ||
    maxDaysValue === undefined ||
    maxDaysValue === null ||
    maxDaysValue === "" ||
    !location ||
    !ownershipConfirmed
  ) {
    showMessage(
      itemFormMessage,
      "Please complete all required fields and confirm resource ownership.",
      "error"
    );
    return;
  }

  const fee = Number(feeValue);
  const maxDuration = Number(maxDaysValue);

  if (!Number.isFinite(fee) || fee < 0) {
    showMessage(
      itemFormMessage,
      "Please enter a valid non-negative fee.",
      "error"
    );
    return;
  }

  if (!Number.isInteger(maxDuration) || maxDuration <= 0) {
    showMessage(
      itemFormMessage,
      "Please select a valid maximum borrowing duration.",
      "error"
    );
    return;
  }

  if (!["Available", "Unavailable"].includes(availability)) {
    showMessage(
      itemFormMessage,
      "Please select a valid availability status.",
      "error"
    );
    return;
  }

  setButtonLoading(addItemButton, true, "Adding Resource...");

  try {
    await currentUser.reload();

    currentUser = auth.currentUser;

    if (!currentUser || !currentUser.emailVerified) {
      throw new Error("Please verify your email before adding a resource.");
    }

    await addDoc(collection(db, "items"), {
      name,
      category,
      condition,
      description,
      location,

      fee,
      maxDuration,

      ownerId: currentUser.uid,
      ownerName: currentUserName,

      available: availability === "Available",
      activeRequestId: null,
      isArchived: false,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    addItemForm.reset();

    showMessage(
      itemFormMessage,
      "Resource added successfully!",
      "success"
    );

    await refreshDashboard();

  } catch (error) {
    console.error("Add resource error:", error);

    showMessage(
      itemFormMessage,
      error.message || "Unable to add this resource.",
      "error"
    );

  } finally {
    setButtonLoading(addItemButton, false);
  }
}


if (addItemForm) {
  addItemForm.addEventListener("submit", handleAddItem);
}


/* =========================================
   17. REFRESH DASHBOARD
========================================= */

async function refreshDashboard() {
  if (!currentUser) return;

  await Promise.all([
    loadReceivedRequests(),
    loadMyItems(),
    loadMyRequests(),
    loadMyBorrowings(),
    loadHistory()
  ]);
}


/* =========================================
   18. LOAD HISTORY
========================================= */

async function loadHistory() {
  if (!currentUser || !historyList) return;

  try {
    const requestsQuery = query(
      collection(db, "borrowRequests"),
      where("ownerId", "==", currentUser.uid)
    );

    const borrowerQuery = query(
      collection(db, "borrowRequests"),
      where("borrowerId", "==", currentUser.uid)
    );

    const [ownerSnapshot, borrowerSnapshot] = await Promise.all([
      getDocs(requestsQuery),
      getDocs(borrowerQuery)
    ]);

    const historyMap = new Map();

    ownerSnapshot.docs.forEach((document) => {
      historyMap.set(document.id, {
        id: document.id,
        ...document.data()
      });
    });

    borrowerSnapshot.docs.forEach((document) => {
      historyMap.set(document.id, {
        id: document.id,
        ...document.data()
      });
    });

    const history = Array.from(historyMap.values()).filter((request) => {
      return [
        "rejected",
        "returned"
      ].includes(request.status);
    });

    history.sort(
      (a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt)
    );

    if (history.length === 0) {
      showEmptyMessage(
        historyList,
        "No borrowing history available."
      );
      return;
    }

    historyList.innerHTML = history.map((request) => {
      const otherPerson =
        request.ownerId === currentUser.uid
          ? request.borrowerName
          : request.ownerName;

      return `
        <div class="request-card">
          <div class="request-card-header">
            <h3>${escapeHTML(request.itemName || "Resource")}</h3>

            <span class="status-badge ${statusClass(request.status)}">
              ${escapeHTML(formatStatus(request.status))}
            </span>
          </div>

          <p><strong>Other User:</strong>
            ${escapeHTML(otherPerson || "Student")}
          </p>

          <p><strong>Updated:</strong>
            ${formatDate(request.updatedAt)}
          </p>

          <div class="card-actions">
            ${createChatLink(request.id)}
          </div>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("History error:", error);

    showEmptyMessage(
      historyList,
      "Unable to load borrowing history."
    );
  }
}


/* =========================================
   19. EVENT DELEGATION
========================================= */

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const action = button.dataset.action;
  const requestId = button.dataset.requestId;
  const itemId = button.dataset.itemId;

  button.disabled = true;

  try {
    if (action === "approve" && requestId) {
      await approveRequest(requestId);
    }

    if (action === "reject" && requestId) {
      await rejectRequest(requestId);
    }

    if (action === "request-return" && requestId) {
      await requestReturn(requestId);
    }

    if (action === "confirm-return" && requestId) {
      await confirmReturn(requestId);
    }

    if (action === "archive-item" && itemId) {
      await archiveItem(itemId);
    }

  } finally {
    button.disabled = false;
  }
});


/* =========================================
   20. LOGOUT
========================================= */

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    const confirmed = confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    try {
      await signOut(auth);
      window.location.href = "login.html";

    } catch (error) {
      console.error("Logout error:", error);
      alert("Unable to log out. Please try again.");
    }
  });
}


/* =========================================
   21. AUTH STATE
========================================= */

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    await loadUserProfile();

    await refreshDashboard();

  } catch (error) {
    console.error("Dashboard initialization error:", error);

  } finally {
    authReadyResolve();
  }
});


/* =========================================
   22. PAGE LOAD PROTECTION
========================================= */

window.addEventListener("pageshow", async (event) => {
  if (event.persisted) {
    await authStateReady;

    if (!auth.currentUser) {
      window.location.href = "login.html";
    }
  }
});
