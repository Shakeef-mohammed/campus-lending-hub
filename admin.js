
import { auth, db } from "../firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


const loadingSection = document.getElementById("adminLoading");
const deniedSection = document.getElementById("adminAccessDenied");
const dashboardSection = document.getElementById("adminDashboard");

const logoutButton = document.getElementById("adminLogoutButton");

const totalUsers = document.getElementById("totalUsers");
const totalResources = document.getElementById("totalResources");
const totalRequests = document.getElementById("totalRequests");
const pendingRequests = document.getElementById("pendingRequests");

const usersTableBody = document.getElementById("usersTableBody");
const resourcesTableBody = document.getElementById("resourcesTableBody");
const requestsTableBody = document.getElementById("requestsTableBody");

const usersMessage = document.getElementById("usersMessage");
const resourcesMessage = document.getElementById("resourcesMessage");
const requestsMessage = document.getElementById("requestsMessage");


let currentAdmin = null;


function showDenied(message = "You do not have permission to access this page.") {
    loadingSection.hidden = true;
    dashboardSection.hidden = true;
    deniedSection.hidden = false;

    deniedSection.querySelector("p").textContent = message;
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


function setMessage(element, message, type = "") {
    element.textContent = message;
    element.className = `admin-message ${type}`.trim();
}


async function verifyAdmin(user) {
    await user.reload();

    if (!user.emailVerified) {
        throw new Error("Please verify your email before accessing the Admin Panel.");
    }

    const tokenResult = await user.getIdTokenResult(true);

    if (tokenResult.claims.admin !== true) {
        throw new Error("Your account does not have administrator permission.");
    }

    return true;
}


async function loadUsers() {
    setMessage(usersMessage, "Loading users...");
    usersTableBody.innerHTML = "";

    const snapshot = await getDocs(collection(db, "users"));

    totalUsers.textContent = snapshot.size;

    if (snapshot.empty) {
        setMessage(usersMessage, "No registered users found.");
        return;
    }

    const rows = snapshot.docs.map(documentSnapshot => {
        const user = documentSnapshot.data();

        return `
            <tr>
                <td>${escapeHTML(user.displayName)}</td>
                <td>${escapeHTML(user.email)}</td>
                <td>${escapeHTML(user.studentId)}</td>
                <td>${escapeHTML(user.university)}</td>
            </tr>
        `;
    });

    usersTableBody.innerHTML = rows.join("");
    setMessage(usersMessage, `${snapshot.size} users loaded.`, "success");
}


async function loadResources() {
    setMessage(resourcesMessage, "Loading resources...");
    resourcesTableBody.innerHTML = "";

    const snapshot = await getDocs(collection(db, "items"));

    totalResources.textContent = snapshot.size;

    if (snapshot.empty) {
        setMessage(resourcesMessage, "No resources found.");
        return;
    }

    const rows = snapshot.docs.map(documentSnapshot => {
        const item = documentSnapshot.data();

        return `
            <tr>
                <td>${escapeHTML(item.name)}</td>
                <td>${escapeHTML(item.category)}</td>
                <td>${escapeHTML(item.ownerName)}</td>
                <td>${item.available === true ? "Available" : "Borrowed / Unavailable"}</td>
            </tr>
        `;
    });

    resourcesTableBody.innerHTML = rows.join("");
    setMessage(resourcesMessage, `${snapshot.size} resources loaded.`, "success");
}


async function loadRequests() {
    setMessage(requestsMessage, "Loading borrow requests...");
    requestsTableBody.innerHTML = "";

    const snapshot = await getDocs(collection(db, "borrowRequests"));

    totalRequests.textContent = snapshot.size;

    const pendingCount = snapshot.docs.filter(
        documentSnapshot => documentSnapshot.data().status === "pending"
    ).length;

    pendingRequests.textContent = pendingCount;

    if (snapshot.empty) {
        setMessage(requestsMessage, "No borrow requests found.");
        return;
    }

    const rows = snapshot.docs.map(documentSnapshot => {
        const request = documentSnapshot.data();

        return `
            <tr>
                <td>${escapeHTML(request.itemName)}</td>
                <td>${escapeHTML(request.borrowerName)}</td>
                <td>${escapeHTML(request.ownerName)}</td>
                <td>${escapeHTML(request.status)}</td>
            </tr>
        `;
    });

    requestsTableBody.innerHTML = rows.join("");
    setMessage(requestsMessage, `${snapshot.size} requests loaded.`, "success");
}


async function loadAdminData() {
    if (!currentAdmin) return;

    const results = await Promise.allSettled([
        loadUsers(),
        loadResources(),
        loadRequests()
    ]);

    const failed = results.some(result => result.status === "rejected");

    if (failed) {
        console.error("Some admin data could not be loaded:", results);
        alert("Some information could not be loaded. Check Firestore permissions.");
    }
}


async function handleLogout() {
    try {
        await signOut(auth);
        window.location.replace("login.html");
    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to log out. Please try again.");
    }
}


logoutButton?.addEventListener("click", handleLogout);

document.getElementById("refreshUsersButton")
    ?.addEventListener("click", loadUsers);

document.getElementById("refreshResourcesButton")
    ?.addEventListener("click", loadResources);

document.getElementById("refreshRequestsButton")
    ?.addEventListener("click", loadRequests);


onAuthStateChanged(auth, async user => {
    loadingSection.hidden = false;
    dashboardSection.hidden = true;
    deniedSection.hidden = true;

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    try {
        await verifyAdmin(user);

        currentAdmin = user;

        loadingSection.hidden = true;
        dashboardSection.hidden = false;

        await loadAdminData();

    } catch (error) {
        console.error("Admin verification failed:", error);
        currentAdmin = null;
        showDenied(error.message);
    }
});
