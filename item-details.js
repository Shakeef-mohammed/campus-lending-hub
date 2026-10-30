
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const detailsMessage = document.getElementById("detailsMessage");
const itemDetails = document.getElementById("item-details");

const borrowForm = document.getElementById("borrowForm");
const borrowButton = document.getElementById("borrowButton");
const borrowMessage = document.getElementById("borrowMessage");

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

const itemId = new URLSearchParams(window.location.search).get("item");

let currentUser = null;
let selectedItem = null;
let authReady = false;

function showDetailsMessage(message, type = "info") {
    detailsMessage.textContent = message;
    detailsMessage.className = `details-message ${type}`;
}

function showBorrowMessage(message, type = "info") {
    borrowMessage.textContent = message;
    borrowMessage.className = type;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatFee(fee) {
    const amount = Number(fee ?? 0);

    if (!Number.isFinite(amount) || amount <= 0) {
        return "Free";
    }

    return `Rs. ${amount.toLocaleString("en-LK")}`;
}

function getCategoryIcon(category) {
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

function setBorrowingEnabled(enabled) {
    borrowButton.disabled = !enabled;
    borrowButton.textContent = enabled
        ? "Send Borrow Request"
        : "Currently Unavailable";
}

function renderItem(item) {
    selectedItem = item;

    document.title = `${item.name || "Resource"} | CampusLend`;

    document.getElementById("itemName").textContent =
        item.name || "Untitled Resource";

    document.getElementById("itemCategory").textContent =
        item.category || "Other";

    document.getElementById("itemDescription").textContent =
        item.description || "No description available.";

    document.getElementById("itemCondition").textContent =
        item.condition || "Not specified";

    document.getElementById("itemLocation").textContent =
        item.location || "Not specified";

    document.getElementById("itemFee").textContent =
        formatFee(item.fee);

    document.getElementById("itemDuration").textContent =
        item.maxDuration
            ? `${item.maxDuration} days`
            : "Not specified";

    document.getElementById("ownerName").textContent =
        item.ownerName || "Campus Member";

    document.getElementById("itemIcon").textContent =
        getCategoryIcon(item.category);

    const available = item.available === true &&
        !item.activeRequestId;

    const badge = document.getElementById("availabilityBadge");

    badge.textContent = available ? "Available" : "Unavailable";
    badge.classList.toggle("unavailable", !available);

    if (!available) {
        setBorrowingEnabled(false);
    }

    itemDetails.hidden = false;
    detailsMessage.hidden = true;
}

async function loadItem() {
    if (!itemId) {
        showDetailsMessage("Invalid resource link.", "error");
        return;
    }

    try {
        const itemRef = doc(db, "items", itemId);
        const itemSnapshot = await getDoc(itemRef);

        if (!itemSnapshot.exists()) {
            showDetailsMessage("This resource could not be found.", "error");
            return;
        }

        renderItem({
            id: itemSnapshot.id,
            ...itemSnapshot.data()
        });

    } catch (error) {
        console.error("Error loading item:", error);
        showDetailsMessage(
            "Unable to load this resource. Please try again.",
            "error"
        );
    }
}

function getDateValue(date) {
    return new Date(`${date}T00:00:00`);
}

function validateDates() {
    const startValue = startDateInput.value;
    const endValue = endDateInput.value;

    if (!startValue || !endValue) {
        return "Please select both borrowing dates.";
    }

    const startDate = getDateValue(startValue);
    const endDate = getDateValue(endValue);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())) {
        return "Please enter valid dates.";
    }

    if (startDate < today) {
        return "The start date cannot be in the past.";
    }

    if (endDate <= startDate) {
        return "The return date must be after the start date.";
    }

    const duration = Math.ceil(
        (endDate - startDate) / (1000 * 60 * 60 * 24)
    );

    const maximumDuration = Number(selectedItem?.maxDuration || 0);

    if (maximumDuration > 0 && duration > maximumDuration) {
        return `Maximum borrowing duration is ${maximumDuration} days.`;
    }

    return null;
}

function setFormSubmitting(submitting) {
    borrowButton.disabled = submitting;
    borrowButton.textContent = submitting
        ? "Sending Request..."
        : "Send Borrow Request";
}

async function sendBorrowRequest(event) {
    event.preventDefault();

    if (!authReady || !currentUser) {
        showBorrowMessage(
            "Please login before requesting to borrow this item.",
            "error"
        );

        window.location.href = "login.html";
        return;
    }

    try {
        await currentUser.reload();
        currentUser = auth.currentUser;

        if (!currentUser || !currentUser.emailVerified) {
            showBorrowMessage(
                "Please verify your email before borrowing resources.",
                "error"
            );

            return;
        }

        if (!selectedItem) {
            showBorrowMessage("Resource details are not available.", "error");
            return;
        }

        if (selectedItem.ownerId === currentUser.uid) {
            showBorrowMessage(
                "You cannot borrow your own resource.",
                "error"
            );

            return;
        }

        const dateError = validateDates();

        if (dateError) {
            showBorrowMessage(dateError, "error");
            return;
        }

        const itemRef = doc(db, "items", itemId);

        const requestRef = doc(collection(db, "borrowRequests"));

        const borrowerName =
            currentUser.displayName ||
            currentUser.email.split("@")[0];

        setFormSubmitting(true);
        showBorrowMessage("Sending your borrow request...", "info");

        await runTransaction(db, async transaction => {
            const itemSnapshot = await transaction.get(itemRef);

            if (!itemSnapshot.exists()) {
                throw new Error("ITEM_NOT_FOUND");
            }

            const latestItem = itemSnapshot.data();

            if (latestItem.ownerId === currentUser.uid) {
                throw new Error("OWN_ITEM");
            }

            if (
                latestItem.available !== true ||
                latestItem.activeRequestId
            ) {
                throw new Error("ITEM_UNAVAILABLE");
            }

            transaction.set(requestRef, {
                itemId: itemId,
                itemName: latestItem.name || "Resource",
                ownerId: latestItem.ownerId,
                ownerName: latestItem.ownerName || "Campus Member",
                borrowerId: currentUser.uid,
                borrowerName: borrowerName,
                status: "pending",
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            transaction.update(itemRef, {
                available: false,
                activeRequestId: requestRef.id,
                updatedAt: serverTimestamp()
            });
        });

        showBorrowMessage(
            "Your borrow request has been sent successfully!",
            "success"
        );

        borrowForm.reset();
        setBorrowingEnabled(false);

    } catch (error) {
        console.error("Borrow request error:", error);

        const messages = {
            ITEM_NOT_FOUND: "This resource no longer exists.",
            OWN_ITEM: "You cannot borrow your own resource.",
            ITEM_UNAVAILABLE: "This item is no longer available."
        };

        showBorrowMessage(
            messages[error.message] ||
            "Unable to send your request. Please try again.",
            "error"
        );

        if (error.code === "permission-denied") {
            showBorrowMessage(
                "Permission denied. Please check your account verification and Firestore Rules.",
                "error"
            );
        }

    } finally {
        setFormSubmitting(false);
    }
}

function setDateMinimums() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const minimumDate = `${year}-${month}-${day}`;

    startDateInput.min = minimumDate;
    endDateInput.min = minimumDate;

    startDateInput.addEventListener("change", () => {
        endDateInput.min = startDateInput.value || minimumDate;

        if (
            endDateInput.value &&
            endDateInput.value <= startDateInput.value
        ) {
            endDateInput.value = "";
        }
    });
}

setDateMinimums();

borrowForm.addEventListener("submit", sendBorrowRequest);

onAuthStateChanged(auth, async user => {
    if (!user) {
        currentUser = null;
        authReady = true;
        return;
    }

    try {
        await user.reload();

        currentUser = auth.currentUser;
        authReady = true;

    } catch (error) {
        console.error("Authentication check failed:", error);
        currentUser = null;
        authReady = true;
    }
});

loadItem();
