// Sample resource data
// Later, this data can be retrieved from the Java backend and database.

const resources = {
    1: {
        name: "Data Structures Textbook",
        category: "Books",
        description:
            "A useful textbook for students studying data structures and algorithms. Ideal for university coursework, revision, and exam preparation.",
        location: "University Campus",
        condition: "Good",
        owner: "Campus Resource Member",
        image:
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80",
        available: true
    },

    2: {
        name: "Scientific Calculator",
        category: "Electronics",
        description:
            "A scientific calculator suitable for mathematics, statistics, engineering calculations, and other university subjects.",
        location: "University Campus",
        condition: "Good",
        owner: "Campus Resource Member",
        image:
            "https://images.unsplash.com/photo-1574607383476-f517f260d30b?auto=format&fit=crop&w=900&q=80",
        available: true
    },

    3: {
        name: "Laptop",
        category: "Electronics",
        description:
            "A laptop for academic tasks such as programming, assignments, presentations, and online learning. Handle the equipment carefully.",
        location: "University Campus",
        condition: "Good",
        owner: "Campus Resource Member",
        image:
            "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
        available: true
    },

    4: {
        name: "Football",
        category: "Sports",
        description:
            "A football suitable for friendly matches, practice sessions, and university sports activities.",
        location: "University Sports Area",
        condition: "Good",
        owner: "Campus Resource Member",
        image:
            "https://images.unsplash.com/photo-1614632537423-1e6c2e7e0c8d?auto=format&fit=crop&w=900&q=80",
        available: true
    },

    5: {
        name: "Software Engineering Book",
        category: "Books",
        description:
            "A reference book for students learning software engineering concepts, development practices, and software project management.",
        location: "University Campus",
        condition: "Good",
        owner: "Campus Resource Member",
        image:
            "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
        available: true
    },

    6: {
        name: "Digital Camera",
        category: "Electronics",
        description:
            "A digital camera suitable for photography, student projects, and university events.",
        location: "University Campus",
        condition: "Good",
        owner: "Campus Resource Member",
        image:
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
        available: false
    },

    7: {
        name: "Umbrella",
        category: "Other",
        description:
            "A convenient umbrella for rainy days on campus. Please return it in good condition after borrowing.",
        location: "University Campus",
        condition: "Good",
        owner: "Campus Resource Member",
        image:
            "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=900&q=80",
        available: true
    },

    8: {
        name: "Badminton Racket",
        category: "Sports",
        description:
            "A badminton racket for practice sessions, friendly games, and university sports activities.",
        location: "University Sports Area",
        condition: "Good",
        owner: "Campus Resource Member",
        image:
            "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80",
        available: true
    }
};


// Get the selected item number from the URL
const urlParameters = new URLSearchParams(window.location.search);
const itemId = urlParameters.get("item");

const selectedResource = resources[itemId];


const detailsContainer = document.getElementById("item-details");

// Find resources added through the Add Resource form
function getAddedResources() {
    try {
        return JSON.parse(localStorage.getItem("campusResources") || "[]");
    } catch (error) {
        console.error("Could not load saved resources:", error);
        return [];
    }
}

const addedResources = getAddedResources();

const addedResource = addedResources.find(function (resource) {
    return String(resource.id) === String(itemId);
});

// Support both sample resources and newly added resources
let selectedResource = resources[itemId];

if (addedResource) {
    selectedResource = {
        ...addedResource,
        owner: "Campus Resource Member",
        available: addedResource.availability === "Available"
    };
}

// Safely display resource information
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

if (!selectedResource) {
    detailsContainer.innerHTML = `
        <div class="not-found">
            <h2>Resource Not Found</h2>
            <p>Sorry, we could not find the resource you selected.</p>
            <a href="browse.html">Return to Browse Resources</a>
        </div>
    `;
} else {
    const safeName = escapeHTML(selectedResource.name);
    const safeCategory = escapeHTML(selectedResource.category);
    const safeDescription = escapeHTML(selectedResource.description);
    const safeLocation = escapeHTML(selectedResource.location);
    const safeCondition = escapeHTML(selectedResource.condition);
    const safeOwner = escapeHTML(selectedResource.owner);
    const safeImage = selectedResource.image || "";

    detailsContainer.innerHTML = `
        <div class="details-card">
            <div class="details-image-container">
                <img
                    src="${escapeHTML(safeImage)}"
                    alt="${safeName}"
                    class="details-image"
                >

                <span class="availability-badge ${
                    selectedResource.available ? "" : "unavailable"
                }">
                    ${
                        selectedResource.available
                            ? "Available to Borrow"
                            : "Currently Unavailable"
                    }
                </span>
            </div>

            <div class="details-info">
                <span class="category-label">${safeCategory}</span>
                <h1>${safeName}</h1>
                <p class="item-description">${safeDescription}</p>

                <ul class="item-info-list">
                    <li><strong>Category:</strong> ${safeCategory}</li>
                    <li><strong>Location:</strong> ${safeLocation}</li>
                    <li><strong>Condition:</strong> ${safeCondition}</li>
                    <li><strong>Listed by:</strong> ${safeOwner}</li>
                    ${
                        addedResource
                            ? `<li><strong>Borrowing fee:</strong> LKR ${escapeHTML(addedResource.fee || "0")}</li>
                               <li><strong>Maximum borrowing period:</strong> ${escapeHTML(addedResource.maxDuration || "Not specified")} days</li>`
                            : ""
                    }
                </ul>

                ${
                    selectedResource.available
                        ? `
                            <section class="borrowing-section">
                                <h2>Request to Borrow</h2>

                                <form id="borrow-form">
                                    <div class="form-group">
                                        <label for="start-date">Borrowing Start Date</label>
                                        <input type="date" id="start-date" required>
                                    </div>

                                    <div class="form-group">
                                        <label for="end-date">Expected Return Date</label>
                                        <input type="date" id="end-date" required>
                                    </div>

                                    <button type="submit" class="borrow-button">
                                        Request to Borrow
                                    </button>

                                    <div id="borrow-message"
                                         class="message"
                                         role="status"
                                         aria-live="polite"></div>
                                </form>
                            </section>
                        `
                        : `
                            <section class="borrowing-section">
                                <h2>Not Available</h2>
                                <p>This resource is currently unavailable. Please browse other resources.</p>
                            </section>
                        `
                }
            </div>
        </div>
    `;

    const startDateInput = document.getElementById("start-date");
    const endDateInput = document.getElementById("end-date");
    const borrowForm = document.getElementById("borrow-form");

    if (startDateInput && endDateInput && borrowForm) {
        const today = new Date();
        const localToday = new Date(
            today.getTime() - today.getTimezoneOffset() * 60000
        ).toISOString().split("T")[0];

        startDateInput.min = localToday;
        endDateInput.min = localToday;

        startDateInput.addEventListener("change", function () {
            endDateInput.min = startDateInput.value || localToday;

            if (endDateInput.value && endDateInput.value < startDateInput.value) {
                endDateInput.value = "";
            }
        });

        borrowForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const startDate = startDateInput.value;
            const endDate = endDateInput.value;

            if (startDate < localToday) {
                showMessage("The borrowing date cannot be in the past.", "error");
                return;
            }

            if (endDate < startDate) {
                showMessage(
                    "The return date must be on or after the borrowing date.",
                    "error"
                );
                return;
            }

            // Check the maximum borrowing period for newly added resources
            if (addedResource && addedResource.maxDuration) {
                const start = new Date(startDate + "T00:00:00");
                const end = new Date(endDate + "T00:00:00");
                const days = Math.round((end - start) / 86400000);

                if (days > Number(addedResource.maxDuration)) {
                    showMessage(
                        "The maximum borrowing period is " +
                        addedResource.maxDuration + " days.",
                        "error"
                    );
                    return;
                }
            }

            try {
                const borrowings = JSON.parse(
                    localStorage.getItem("campusBorrowings") || "[]"
                );

                borrowings.push({
                    id: Date.now(),
                    resourceId: String(itemId),
                    resourceName: selectedResource.name,
                    category: selectedResource.category,
                    location: selectedResource.location,
                    startDate: startDate,
                    endDate: endDate,
                    status: "Pending",
                    requestedAt: new Date().toISOString()
                });

                localStorage.setItem(
                    "campusBorrowings",
                    JSON.stringify(borrowings)
                );

                showMessage(
                    "Borrowing request saved! You can view it in My Borrowings.",
                    "success"
                );

                borrowForm.reset();
                endDateInput.min = localToday;
            } catch (error) {
                console.error("Could not save borrowing request:", error);
                showMessage(
                    "Could not save your request. Please try again.",
                    "error"
                );
            }
        });
    }
}

// Show success or error messages
function showMessage(message, type) {
    const messageElement = document.getElementById("borrow-message");

    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;
    messageElement.className = "message " + type;
}

