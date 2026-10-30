
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


// HTML Elements

const logoutButton = document.getElementById("adminLogout");

const totalUsers = document.getElementById("totalUsers");
const totalResources = document.getElementById("totalResources");
const totalRequests = document.getElementById("totalRequests");
const pendingRequests = document.getElementById("pendingRequests");

const adminMessage = document.getElementById("adminMessage");


// Display message

function showMessage(message, isError = false) {
    if (!adminMessage) return;

    adminMessage.textContent = message;
    adminMessage.style.color = isError ? "#b42318" : "#187b57";
}


// Verify administrator permission

async function verifyAdmin(user) {
    await user.reload();

    if (!user.emailVerified) {
        throw new Error(
            "Please verify your email before accessing the Admin Panel."
        );
    }

    const tokenResult = await user.getIdTokenResult(true);

    if (tokenResult.claims.admin !== true) {
        throw new Error(
            "Your account does not have administrator permission."
        );
    }

    return true;
}


// Load total users

async function loadUsers() {
    const snapshot = await getDocs(collection(db, "users"));

    totalUsers.textContent = snapshot.size;
}


// Load total resources

async function loadResources() {
    const snapshot = await getDocs(collection(db, "items"));

    totalResources.textContent = snapshot.size;
}


// Load borrow requests

async function loadRequests() {
    const snapshot = await getDocs(collection(db, "borrowRequests"));

    totalRequests.textContent = snapshot.size;

    const pendingCount = snapshot.docs.filter(documentSnapshot => {
        return documentSnapshot.data().status === "pending";
    }).length;

    pendingRequests.textContent = pendingCount;
}


// Load all admin dashboard data

async function loadAdminData() {
    showMessage("Loading dashboard information...");

    totalUsers.textContent = "...";
    totalResources.textContent = "...";
    totalRequests.textContent = "...";
    pendingRequests.textContent = "...";

    try {
        await Promise.all([
            loadUsers(),
            loadResources(),
            loadRequests()
        ]);

        showMessage("Admin dashboard loaded successfully.");

    } catch (error) {
        console.error("Admin data loading error:", error);

        showMessage(
            "Unable to load some information. Check Firestore permissions.",
            true
        );
    }
}


// Admin logout

async function handleLogout() {
    try {
        await signOut(auth);

        window.location.replace("login.html");

    } catch (error) {
        console.error("Logout error:", error);

        showMessage("Unable to log out. Please try again.", true);
    }
}


logoutButton?.addEventListener("click", handleLogout);


// Authentication state listener

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    try {
        await verifyAdmin(user);

        await loadAdminData();

    } catch (error) {
        console.error("Admin verification failed:", error);

        await signOut(auth);

        window.location.replace("login.html");
    }

});
