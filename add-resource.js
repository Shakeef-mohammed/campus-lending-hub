import { auth, db } from "../firebase-config.js";

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
let authReady = false;


function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
}


function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting
        ? "Publishing..."
        : "Submit Resource →";
}


function getFormData() {
    return {
        name: document.getElementById("resourceName").value.trim(),
        category: document.getElementById("category").value,
        condition: document.getElementById("condition").value,
        description: document.getElementById("description").value.trim(),
        available: document.getElementById("availability").value === "Available",
        fee: Number(document.getElementById("fee").value),
        maxDuration: Number(document.getElementById("maxDays").value),
        location: document.getElementById("location").value.trim()
    };
}


function validateResource(resource) {
    if (!resource.name || resource.name.length > 100) {
        return "Please enter a valid resource name.";
    }

    if (!resource.category || !resource.condition) {
        return "Please select a category and item condition.";
    }

    if (!resource.description || resource.description.length > 1000) {
        return "Please enter a valid description.";
    }

    if (!Number.isFinite(resource.fee) || resource.fee < 0 || resource.fee > 1000000) {
        return "Please enter a valid borrowing fee.";
    }

    if (![1, 2, 3, 5, 7, 14].includes(resource.maxDuration)) {
        return "Please select a valid maximum borrowing period.";
    }

    if (!resource.location || resource.location.length > 150) {
        return "Please enter a valid pickup location.";
    }

    return null;
}


// Check authentication and email verification.
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    try {
        await user.reload();

        if (!user.emailVerified) {
            showMessage(
                "Please verify your email address before publishing a resource.",
                "error"
            );

            await signOut(auth);
            window.location.replace("login.html");
            return;
        }

        currentUser = auth.currentUser;
        authReady = true;

    } catch (error) {
        console.error("Authentication check failed:", error);
        showMessage("Unable to verify your account. Please sign in again.", "error");
    }
});


// Publish resource to Firestore.
resourceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authReady || !currentUser) {
        showMessage("Please wait while your account is being verified.", "error");
        return;
    }

    setSubmitting(true);

    try {
        await currentUser.reload();

        if (!currentUser.emailVerified) {
            showMessage("Please verify your email before publishing.", "error");
            await signOut(auth);
            window.location.replace("login.html");
            return;
        }

        const resource = getFormData();
        const validationError = validateResource(resource);

        if (validationError) {
            showMessage(validationError, "error");
            return;
        }

        const ownerName =
            currentUser.displayName ||
            currentUser.email.split("@")[0];

        await addDoc(collection(db, "items"), {
            name: resource.name,
            category: resource.category,
            condition: resource.condition,
            description: resource.description,
            location: resource.location,

            fee: resource.fee,
            maxDuration: resource.maxDuration,

            ownerId: currentUser.uid,
            ownerName: ownerName,

            available: resource.available,
            activeRequestId: null,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        showMessage(
            "Resource published successfully! You can view it in Browse Resources.",
            "success"
        );

        resourceForm.reset();

        document.getElementById("fee").value = "0";

        setTimeout(() => {
            window.location.href = "browse.html";
        }, 1800);

    } catch (error) {
        console.error("Resource publishing failed:", error);

        if (error.code === "permission-denied") {
            showMessage(
                "Permission denied. Firestore Security Rules may need to be updated.",
                "error"
            );
        } else {
            showMessage(
                "Unable to publish your resource. Please try again.",
                "error"
            );
        }

    } finally {
        setSubmitting(false);
    }
});
