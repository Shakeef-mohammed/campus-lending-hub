
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
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
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


/* =====================================
   DOM ELEMENTS
===================================== */

const userNameElement = document.getElementById("userName");
const welcomeNameElement = document.getElementById("welcomeName");
const logoutButton = document.getElementById("logoutButton");

const requestsList = document.getElementById("requestsList");
const itemsList = document.getElementById("itemsList");
const myRequestsList = document.getElementById("myRequestsList");
const myBorrowingsList = document.getElementById("myBorrowingsList");
const historyList = document.getElementById("historyList");

const addItemForm = document.getElementById("addItemForm");
const itemFormMessage = document.getElementById("itemFormMessage");
const addItemButton = document.getElementById("addItemButton");

let currentUser = null;
let currentUserName = "Campus Member";
let dashboardReady = false;


/* =====================================
   COMMON FUNCTIONS
===================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function showMessage(element, message, type = "info") {
    if (!element) return;

    element.textContent = message;
    element.className = `form-message ${type}`;
}

function setButtonLoading(button, loading, normalText) {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : normalText;
}

function formatDate(timestamp) {
    if (!timestamp) return "Date unavailable";

    const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString("en-GB");
}

function formatStatus(status) {
    const labels = {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        return_requested: "Return Requested",
        returned: "Returned"
    };

    return labels[status] || status || "Unknown";
}

function statusClass(status) {
    return String(status || "unknown")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
}

function createEmptyMessage(message) {
    const paragraph = document.createElement("p");
    paragraph.className = "empty-message";
    paragraph.textContent = message;
    return paragraph;
}

function appendEmptyMessage(container, message) {
    if (!container) return;

    container.innerHTML = "";
    container.appendChild(createEmptyMessage(message));
}

function createActionButton(text, action, requestId, className = "") {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = text;
    button.className = className;
    button.dataset.action = action;
    button.dataset.requestId = requestId;

    return button;
}

function createRequestLink(requestId) {
    const link = document.createElement("a");

    link.href = `chat.html?requestId=${encodeURIComponent(requestId)}`;
    link.textContent = "Open Chat";
    link.className = "chat-btn";

    return link;
}

function getItemIcon(category) {
    const icons = {
        Books: "📚",
        Electronics: "💻",
        Photography: "📷",
        Sports: "⚽",
        Tools: "🛠️",
        Stationery: "📝",
        Other: "🎒"
    };

    return icons[category] || "📦";
}


/* =====================================
   USER PROFILE
===================================== */

async function loadUserProfile() {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
        const profile = userSnapshot.data();

        currentUserName =
            profile.displayName ||
            currentUser.displayName ||
            currentUser.email.split("@")[0];

    } else {
        currentUserName =
            currentUser.displayName ||
            currentUser.email.split("@")[0];
    }

    if (userNameElement) {
        userNameElement.textContent = currentUserName;
    }

    if (welcomeNameElement) {
        welcomeNameElement.textContent = currentUserName;
    }
}


/* =====================================
   LOAD OWNER'S RECEIVED REQUESTS
===================================== */

async function loadReceivedRequests() {
    if (!requestsList) return;

    appendEmptyMessage(requestsList, "Loading requests...");

    try {
        const requestsQuery = query(
            collection(db, "borrowRequests"),
            where("ownerId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(requestsQuery);

        requestsList.innerHTML = "";

        const requests = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        requests.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
        });

        if (requests.length === 0) {
            appendEmptyMessage(
                requestsList,
                "You have not received any borrow requests yet."
            );
            return;
        }

        requests.forEach(request => {
            const card = document.createElement("div");
            card.className = "request-card";

            const heading = document.createElement("h3");
            heading.textContent = request.itemName || "Resource";

            const borrower = document.createElement("p");
            borrower.textContent =
                `Borrower: ${request.borrowerName || "Campus Member"}`;

            const dates = document.createElement("p");
            dates.textContent =
                `Borrowing: ${request.startDate || "-"} to ${request.endDate || "-"}`;

            const date = document.createElement("p");
            date.textContent = `Requested: ${formatDate(request.createdAt)}`;

            const status = document.createElement("span");
            status.className = `status-badge ${statusClass(request.status)}`;
            status.textContent = formatStatus(request.status);

            card.append(heading, borrower, dates, date, status);

            const actions = document.createElement("div");
            actions.className = "request-actions";

            actions.appendChild(createRequestLink(request.id));

            if (request.status === "pending") {
                actions.appendChild(
                    createActionButton(
                        "Accept",
                        "accept",
                        request.id,
                        "accept-btn"
                    )
                );

                actions.appendChild(
                    createActionButton(
                        "Reject",
                        "reject",
                        request.id,
                        "reject-btn"
                    )
                );
            }

            if (request.status === "return_requested") {
                actions.appendChild(
                    createActionButton(
                        "Confirm Return",
                        "confirm-return",
                        request.id,
                        "accept-btn"
                    )
                );
            }

            card.appendChild(actions);
            requestsList.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading received requests:", error);

        appendEmptyMessage(
            requestsList,
            "Unable to load received requests."
        );
    }
}


/* =====================================
   ACCEPT / REJECT BORROW REQUEST
===================================== */

async function updateBorrowRequest(requestId, action) {
    if (!currentUser || !currentUser.emailVerified) {
        alert("Please verify your email before performing this action.");
        return;
    }

    const requestRef = doc(db, "borrowRequests", requestId);

    try {
        await runTransaction(db, async transaction => {
            const requestSnapshot = await transaction.get(requestRef);

            if (!requestSnapshot.exists()) {
                throw new Error("REQUEST_NOT_FOUND");
            }

            const request = requestSnapshot.data();

            if (request.ownerId !== currentUser.uid) {
                throw new Error("NOT_OWNER");
            }

            if (request.status !== "pending") {
                throw new Error("REQUEST_ALREADY_PROCESSED");
            }

            const itemRef = doc(db, "items", request.itemId);
            const itemSnapshot = await transaction.get(itemRef);

            if (!itemSnapshot.exists()) {
                throw new Error("ITEM_NOT_FOUND");
            }

            const item = itemSnapshot.data();

            if (item.ownerId !== currentUser.uid) {
                throw new Error("NOT_ITEM_OWNER");
            }

            if (item.activeRequestId !== requestId) {
                throw new Error("LOCK_MISMATCH");
            }

            if (action === "accept") {
                transaction.update(requestRef, {
                    status: "approved",
                    updatedAt: serverTimestamp()
                });

                transaction.update(itemRef, {
                    available: false,
                    activeRequestId: requestId,
                    updatedAt: serverTimestamp()
                });

            } else if (action === "reject") {
                transaction.update(requestRef, {
                    status: "rejected",
                    updatedAt: serverTimestamp()
                });

                transaction.update(itemRef, {
                    available: true,
                    activeRequestId: null,
                    updatedAt: serverTimestamp()
                });

            } else {
                throw new Error("INVALID_ACTION");
            }
        });

        await refreshDashboard();

        alert(
            action === "accept"
                ? "Borrow request accepted successfully."
                : "Borrow request rejected successfully."
        );

    } catch (error) {
        console.error("Request update error:", error);

        const messages = {
            REQUEST_NOT_FOUND: "Request not found.",
            NOT_OWNER: "You are not the owner of this request.",
            REQUEST_ALREADY_PROCESSED: "This request has already been processed.",
            ITEM_NOT_FOUND: "The resource could not be found.",
            NOT_ITEM_OWNER: "You are not the owner of this resource.",
            LOCK_MISMATCH: "The resource lock does not match this request."
        };

        alert(
            messages[error.message] ||
            "Unable to update request. Please try again."
        );
    }
}


/* =====================================
   BORROWER REQUESTS RETURN
===================================== */

async function requestReturn(requestId) {
    if (!currentUser || !currentUser.emailVerified) {
        alert("Please verify your email first.");
        return;
    }

    const requestRef = doc(db, "borrowRequests", requestId);

    try {
        await runTransaction(db, async transaction => {
            const requestSnapshot = await transaction.get(requestRef);

            if (!requestSnapshot.exists()) {
                throw new Error("REQUEST_NOT_FOUND");
            }

            const request = requestSnapshot.data();

            if (request.borrowerId !== currentUser.uid) {
                throw new Error("NOT_BORROWER");
            }

            if (request.status !== "approved") {
                throw new Error("NOT_ACTIVE");
            }

            transaction.update(requestRef, {
                status: "return_requested",
                returnRequestedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });

        await refreshDashboard();

        alert(
            "Return request sent. The owner must confirm receiving the item."
        );

    } catch (error) {
        console.error("Return request error:", error);

        const messages = {
            REQUEST_NOT_FOUND: "Borrow request not found.",
            NOT_BORROWER: "You are not the borrower.",
            NOT_ACTIVE: "This borrowing is not currently active."
        };

        alert(
            messages[error.message] ||
            "Unable to request return. Please try again."
        );
    }
}


/* =====================================
   OWNER CONFIRMS RETURN
===================================== */

async function confirmReturn(requestId) {
    if (!currentUser || !currentUser.emailVerified) {
        alert("Please verify your email first.");
        return;
    }

    const confirmed = window.confirm(
        "Have you physically received this item back from the borrower?"
    );

    if (!confirmed) return;

    const requestRef = doc(db, "borrowRequests", requestId);

    try {
        await runTransaction(db, async transaction => {
            const requestSnapshot = await transaction.get(requestRef);

            if (!requestSnapshot.exists()) {
                throw new Error("REQUEST_NOT_FOUND");
            }

            const request = requestSnapshot.data();

            if (request.ownerId !== currentUser.uid) {
                throw new Error("NOT_OWNER");
            }

            if (request.status !== "return_requested") {
                throw new Error("RETURN_NOT_REQUESTED");
            }

            const itemRef = doc(db, "items", request.itemId);
            const itemSnapshot = await transaction.get(itemRef);

            if (!itemSnapshot.exists()) {
                throw new Error("ITEM_NOT_FOUND");
            }

            const item = itemSnapshot.data();

            if (item.ownerId !== currentUser.uid) {
                throw new Error("NOT_ITEM_OWNER");
            }

            if (item.activeRequestId !== requestId) {
                throw new Error("LOCK_MISMATCH");
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

        await refreshDashboard();

        alert("Return confirmed. The resource is available again.");

    } catch (error) {
        console.error("Return confirmation error:", error);

        const messages = {
            REQUEST_NOT_FOUND: "Request not found.",
            NOT_OWNER: "Only the owner can confirm the return.",
            RETURN_NOT_REQUESTED: "The borrower has not requested a return.",
            ITEM_NOT_FOUND: "The resource could not be found.",
            NOT_ITEM_OWNER: "You are not the owner of this resource.",
            LOCK_MISMATCH: "The resource lock does not match this request."
        };

        alert(
            messages[error.message] ||
            "Unable to confirm return. Please try again."
        );
    }
}


/* =====================================
   LOAD LISTED ITEMS
===================================== */

async function loadMyItems() {
    if (!itemsList) return;

    appendEmptyMessage(itemsList, "Loading your items...");

    try {
        const itemsQuery = query(
            collection(db, "items"),
            where("ownerId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(itemsQuery);

        itemsList.innerHTML = "";

        if (snapshot.empty) {
            appendEmptyMessage(
                itemsList,
                "You have not shared any resources yet."
            );
            return;
        }

        snapshot.forEach(itemDocument => {
            const item = itemDocument.data();

            const card = document.createElement("div");
            card.className = "item-card";

            const heading = document.createElement("h3");
            heading.textContent =
                `${getItemIcon(item.category)} ${item.name || "Untitled Item"}`;

            const category = document.createElement("p");
            category.textContent = `Category: ${item.category || "Other"}`;

            const location = document.createElement("p");
            location.textContent = `Location: ${item.location || "-"}`;

            const status = document.createElement("span");
            status.className = "status-badge";
            status.textContent =
                item.available ? "Available" : "Currently Borrowed / Reserved";

            const link = document.createElement("a");
            link.href =
                `item-details.html?item=${encodeURIComponent(itemDocument.id)}`;
            link.textContent = "View Item";
            link.className = "primary-btn";

            card.append(heading, category, location, status, link);
            itemsList.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading listed items:", error);

        appendEmptyMessage(itemsList, "Unable to load your listed items.");
    }
}


/* =====================================
   LOAD MY BORROW REQUESTS
===================================== */

async function loadMyRequests() {
    if (!myRequestsList) return;

    appendEmptyMessage(myRequestsList, "Loading your requests...");

    try {
        const requestsQuery = query(
            collection(db, "borrowRequests"),
            where("borrowerId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(requestsQuery);

        myRequestsList.innerHTML = "";

        const requests = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        requests.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
        });

        if (requests.length === 0) {
            appendEmptyMessage(
                myRequestsList,
                "You have not sent any borrow requests yet."
            );
            return;
        }

        requests.forEach(request => {
            const card = document.createElement("div");
            card.className = "request-card";

            const heading = document.createElement("h3");
            heading.textContent = request.itemName || "Resource";

            const owner = document.createElement("p");
            owner.textContent =
                `Owner: ${request.ownerName || "Campus Member"}`;

            const dates = document.createElement("p");
            dates.textContent =
                `Borrowing: ${request.startDate || "-"} to ${request.endDate || "-"}`;

            const status = document.createElement("span");
            status.className =
                `status-badge ${statusClass(request.status)}`;
            status.textContent = formatStatus(request.status);

            card.append(heading, owner, dates, status);

            const actions = document.createElement("div");
            actions.className = "request-actions";

            actions.appendChild(createRequestLink(request.id));

            card.appendChild(actions);
            myRequestsList.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading my requests:", error);

        appendEmptyMessage(myRequestsList, "Unable to load your requests.");
    }
}


/* =====================================
   LOAD MY ACTIVE BORROWINGS
===================================== */

async function loadMyBorrowings() {
    if (!myBorrowingsList) return;

    appendEmptyMessage(myBorrowingsList, "Loading borrowings...");

    try {
        const borrowingsQuery = query(
            collection(db, "borrowRequests"),
            where("borrowerId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(borrowingsQuery);

        myBorrowingsList.innerHTML = "";

        const borrowings = snapshot.docs
            .map(document => ({
                id: document.id,
                ...document.data()
            }))
            .filter(request =>
                request.status === "approved" ||
                request.status === "return_requested"
            );

        if (borrowings.length === 0) {
            appendEmptyMessage(
                myBorrowingsList,
                "You have no active borrowings."
            );
            return;
        }

        borrowings.forEach(request => {
            const card = document.createElement("div");
            card.className = "request-card";

            const heading = document.createElement("h3");
            heading.textContent = request.itemName || "Resource";

            const owner = document.createElement("p");
            owner.textContent =
                `Owner: ${request.ownerName || "Campus Member"}`;

            const dates = document.createElement("p");
            dates.textContent =
                `Expected return: ${request.endDate || "-"}`;

            const status = document.createElement("span");
            status.className =
                `status-badge ${statusClass(request.status)}`;
            status.textContent = formatStatus(request.status);

            card.append(heading, owner, dates, status);

            const actions = document.createElement("div");
            actions.className = "request-actions";

            actions.appendChild(createRequestLink(request.id));

            if (request.status === "approved") {
                actions.appendChild(
                    createActionButton(
                        "Request Return",
                        "request-return",
                        request.id,
                        "accept-btn"
                    )
                );
            }

            if (request.status === "return_requested") {
                const waiting = document.createElement("p");
                waiting.textContent =
                    "Waiting for the owner to confirm the return.";
                actions.appendChild(waiting);
            }

            card.appendChild(actions);
            myBorrowingsList.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading borrowings:", error);

        appendEmptyMessage(
            myBorrowingsList,
            "Unable to load your borrowings."
        );
    }
}


/* =====================================
   LOAD BORROWING HISTORY
===================================== */

async function loadHistory() {
    if (!historyList) return;

    appendEmptyMessage(historyList, "Loading history...");

    try {
        const requestsQuery = query(
            collection(db, "borrowRequests"),
            where("borrowerId", "==", currentUser.uid)
        );

        const receivedQuery = query(
            collection(db, "borrowRequests"),
            where("ownerId", "==", currentUser.uid)
        );

        const [borrowedSnapshot, receivedSnapshot] = await Promise.all([
            getDocs(requestsQuery),
            getDocs(receivedQuery)
        ]);

        const records = new Map();

        [...borrowedSnapshot.docs, ...receivedSnapshot.docs].forEach(item => {
            const data = item.data();

            if (
                data.status === "returned" ||
                data.status === "rejected"
            ) {
                records.set(item.id, {
                    id: item.id,
                    ...data
                });
            }
        });

        const history = [...records.values()];

        history.sort((a, b) => {
            const dateA =
                a.updatedAt?.toMillis?.() ||
                a.createdAt?.toMillis?.() || 0;

            const dateB =
                b.updatedAt?.toMillis?.() ||
                b.createdAt?.toMillis?.() || 0;

            return dateB - dateA;
        });

        historyList.innerHTML = "";

        if (history.length === 0) {
            appendEmptyMessage(
                historyList,
                "Your borrowing history is empty."
            );
            return;
        }

        history.forEach(record => {
            const card = document.createElement("div");
            card.className = "history-card";

            const heading = document.createElement("h3");
            heading.textContent = record.itemName || "Resource";

            const role = document.createElement("p");
            role.textContent =
                record.borrowerId === currentUser.uid
                    ? `Owner: ${record.ownerName || "Campus Member"}`
                    : `Borrower: ${record.borrowerName || "Campus Member"}`;

            const status = document.createElement("span");
            status.className =
                `status-badge ${statusClass(record.status)}`;
            status.textContent = formatStatus(record.status);

            const date = document.createElement("p");
            date.textContent =
                `Updated: ${formatDate(record.updatedAt || record.createdAt)}`;

            card.append(heading, role, status, date);
            historyList.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading history:", error);

        appendEmptyMessage(historyList, "Unable to load history.");
    }
}


/* =====================================
   ADD ITEM FROM DASHBOARD
===================================== */

async function handleAddItem(event) {
    event.preventDefault();

    if (!currentUser || !currentUser.emailVerified) {
        showMessage(
            itemFormMessage,
            "Please verify your email before adding an item.",
            "error"
        );
        return;
    }

    const name = document.getElementById("itemName")?.value.trim();
    const category = document.getElementById("itemCategory")?.value;
    const description =
        document.getElementById("itemDescription")?.value.trim();
    const location = document.getElementById("itemLocation")?.value.trim();

    if (!name || !category || !description || !location) {
        showMessage(
            itemFormMessage,
            "Please complete all required fields.",
            "error"
        );
        return;
    }

    try {
        await currentUser.reload();
        currentUser = auth.currentUser;

        if (!currentUser || !currentUser.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
        }

        setButtonLoading(addItemButton, true, "Add Item");

        await addDoc(collection(db, "items"), {
            name,
            category,
            description,
            location,
            condition: "Good",
            fee: 0,
            maxDuration: 0,
            ownerId: currentUser.uid,
            ownerName: currentUserName,
            available: true,
            activeRequestId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        addItemForm.reset();

        showMessage(
            itemFormMessage,
            "Your resource has been added successfully!",
            "success"
        );

        await refreshDashboard();

    } catch (error) {
        console.error("Add item error:", error);

        showMessage(
            itemFormMessage,
            error.message === "EMAIL_NOT_VERIFIED"
                ? "Please verify your email first."
                : "Unable to add item. Please try again.",
            "error"
        );

    } finally {
        setButtonLoading(addItemButton, false, "Add Item");
    }
}


/* =====================================
   DASHBOARD REFRESH
===================================== */

async function refreshDashboard() {
    await Promise.all([
        loadReceivedRequests(),
        loadMyItems(),
        loadMyRequests(),
        loadMyBorrowings(),
        loadHistory()
    ]);
}


/* =====================================
   EVENT DELEGATION
===================================== */

document.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const requestId = button.dataset.requestId;

    if (!requestId) return;

    button.disabled = true;

    try {
        if (action === "accept") {
            await updateBorrowRequest(requestId, "accept");
        }

        if (action === "reject") {
            await updateBorrowRequest(requestId, "reject");
        }

        if (action === "request-return") {
            await requestReturn(requestId);
        }

        if (action === "confirm-return") {
            await confirmReturn(requestId);
        }

    } finally {
        button.disabled = false;
    }
});


/* =====================================
   LOGOUT
===================================== */

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout error:", error);
            alert("Unable to logout. Please try again.");
        }
    });
}


/* =====================================
   AUTHENTICATION
===================================== */

if (addItemForm) {
    addItemForm.addEventListener("submit", handleAddItem);
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        await user.reload();
        currentUser = auth.currentUser;

        if (!currentUser || !currentUser.emailVerified) {
            alert("Please verify your email before accessing the dashboard.");
            await signOut(auth);
            window.location.href = "login.html";
            return;
        }

        await loadUserProfile();

        dashboardReady = true;

        await refreshDashboard();

    } catch (error) {
        console.error("Dashboard initialization error:", error);

        if (error.code === "permission-denied") {
            alert("Access denied. Please check your account and Firestore Rules.");
        } else {
            alert("Unable to load your dashboard. Please try again.");
        }
    }
});
