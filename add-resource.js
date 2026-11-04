
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ========================================
// ALLOWED VALUES
// ========================================

const ALLOWED_CATEGORIES = [
    "Books",
    "Textbooks",
    "Calculators",
    "Electronics",
    "Laptops",
    "Photography",
    "Cameras",
    "Sports",
    "Sports Equipment",
    "Tools",
    "Stationery",
    "Accessories",
    "Other"
];

const ALLOWED_CONDITIONS = [
    "New",
    "Like New",
    "Good",
    "Fair"
];

const ALLOWED_DURATIONS = [1, 2, 3, 5, 7, 14];

const ALLOWED_AVAILABILITY = [
    "Available",
    "Unavailable"
];

// ========================================
// SHARED RESOURCE FORM FUNCTION
// ========================================

export function initResourceForm(config) {

    const form = document.getElementById(config.formId);
    const button = document.getElementById(config.buttonId);
    const message = document.getElementById(config.messageId);

    if (!form || !button || !message) {
        console.error("Resource form elements not found.");
        return;
    }

    let currentUser = null;
    let userProfile = {};
    let authReady = false;
    let isSubmitting = false;

    // ====================================
    // FIELD SELECTORS
    // ====================================

    const fields = config.fields;

    const getField = key =>
        document.getElementById(fields[key]);

    // ====================================
    // MESSAGE
    // ====================================

    function showMessage(text, type = "error") {
        message.textContent = text;
        message.className = `form-message ${type}`;
    }

    // ====================================
    // FORM ENABLE / DISABLE
    // ====================================

    function setFormEnabled(enabled) {

        [...form.elements].forEach(element => {
            element.disabled = !enabled;
        });
    }

    function setSubmitting(submitting) {

        button.disabled = submitting;

        button.textContent = submitting
            ? "Publishing..."
            : config.buttonText;
    }

    // ====================================
    // LOAD USER PROFILE
    // ====================================

    async function loadUserProfile(user) {

        try {

            const profileRef = doc(
                db,
                "users",
                user.uid
            );

            const snapshot = await getDoc(profileRef);

            userProfile = snapshot.exists()
                ? snapshot.data()
                : {};

        } catch (error) {

            console.error(
                "Profile loading error:",
                error
            );

            userProfile = {};
        }
    }

    // ====================================
    // AUTHENTICATION
    // ====================================

    onAuthStateChanged(auth, async user => {

        authReady = false;
        currentUser = user;

        setFormEnabled(false);

        if (!user) {

            showMessage(
                "Please log in to publish a resource."
            );

            if (config.redirectToLogin) {
                window.location.replace("login.html");
            }

            return;
        }

        try {

            await user.reload();

            currentUser = auth.currentUser;

            if (
                !currentUser ||
                !currentUser.emailVerified
            ) {

                showMessage(
                    "Please verify your email before publishing."
                );

                if (config.redirectToLogin) {
                    window.location.replace("login.html");
                }

                return;
            }

            await loadUserProfile(currentUser);

            authReady = true;

            setFormEnabled(true);

            showMessage(
                "Your account is verified. You can publish a resource.",
                "success"
            );

        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );

            showMessage(
                "Unable to verify your account. Please try again."
            );

            setFormEnabled(false);
        }
    });

    // ====================================
    // FORM SUBMISSION
    // ====================================

    form.addEventListener("submit", async event => {

        event.preventDefault();

        if (isSubmitting) return;

        if (!authReady || !currentUser) {

            showMessage(
                "Please sign in with a verified account."
            );

            return;
        }

        // --------------------------------
        // GET VALUES
        // --------------------------------

        const name = getField("name").value.trim();

        const category = getField("category").value;

        const condition = getField("condition").value;

        const description = getField("description").value.trim();

        const availability = getField("availability").value;

        const fee = Number(getField("fee").value);

        const maxDuration = Number(
            getField("maxDuration").value
        );

        const location = getField("location").value.trim();

        const ownershipConfirmed =
            getField("ownership").checked;

        // --------------------------------
        // VALIDATION
        // --------------------------------

        if (
            !name ||
            !category ||
            !condition ||
            !description ||
            !location
        ) {

            showMessage(
                "Please complete all required fields."
            );

            return;
        }

        if (name.length > 100) {

            showMessage(
                "Resource name must not exceed 100 characters."
            );

            return;
        }

        if (description.length > 1000) {

            showMessage(
                "Description must not exceed 1000 characters."
            );

            return;
        }

        if (location.length > 150) {

            showMessage(
                "Pickup location must not exceed 150 characters."
            );

            return;
        }

        if (!ALLOWED_CATEGORIES.includes(category)) {

            showMessage("Please select a valid category.");

            return;
        }

        if (!ALLOWED_CONDITIONS.includes(condition)) {

            showMessage("Please select a valid condition.");

            return;
        }

        if (!ALLOWED_AVAILABILITY.includes(availability)) {

            showMessage("Please select a valid availability status.");

            return;
        }

        if (
            !Number.isFinite(fee) ||
            fee < 0 ||
            fee > 1000000
        ) {

            showMessage("Please enter a valid borrowing fee.");

            return;
        }

        if (!ALLOWED_DURATIONS.includes(maxDuration)) {

            showMessage("Please select a valid borrowing period.");

            return;
        }

        if (!ownershipConfirmed) {

            showMessage(
                "Please confirm that you have permission to list this resource."
            );

            return;
        }

        if (!form.reportValidity()) return;

        // --------------------------------
        // START SUBMISSION
        // --------------------------------

        isSubmitting = true;

        setSubmitting(true);

        try {

            // Refresh login status.

            await currentUser.reload();

            currentUser = auth.currentUser;

            if (
                !currentUser ||
                !currentUser.emailVerified
            ) {

                throw new Error(
                    "Please verify your email before publishing."
                );
            }

            // Determine availability.

            const available =
                availability === "Available";

            // Determine owner name.

            const ownerName =
                userProfile?.displayName ||
                userProfile?.name ||
                currentUser.displayName ||
                currentUser.email ||
                "CampusLend member";

            // --------------------------------
            // FIRESTORE DATA
            // --------------------------------

            const resourceData = {

                name: name,

                category: category,

                condition: condition,

                description: description,

                location: location,

                fee: fee,

                maxDuration: maxDuration,

                ownerId: currentUser.uid,

                ownerName: ownerName,

                available: available,

                activeRequestId: null,

                isArchived: false,

                createdAt: serverTimestamp(),

                updatedAt: serverTimestamp()

            };

            // Save resource.

            await addDoc(
                collection(db, "items"),
                resourceData
            );

            // Reset form.

            form.reset();

            showMessage(
                "Resource published successfully!",
                "success"
            );

            // Execute page-specific action.

            if (typeof config.onSuccess === "function") {
                await config.onSuccess();
            }

        } catch (error) {

            console.error(
                "Resource publishing failed:",
                error
            );

            let errorMessage =
                "Unable to publish your resource. Please try again.";

            if (error.code === "permission-denied") {

                errorMessage =
                    "Permission denied. Please check your Firestore Security Rules.";

            } else if (error.code === "unavailable") {

                errorMessage =
                    "Network unavailable. Please check your internet connection.";

            } else if (error.message) {

                errorMessage = error.message;
            }

            showMessage(errorMessage);

        } finally {

            isSubmitting = false;

            setSubmitting(false);
        }
    });
}
