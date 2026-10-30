
/* ==================================
   CAMPUSLEND BROWSE RESOURCES PAGE
   ================================== */

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const categoryButtons = document.querySelectorAll(".category-button");
const resourceCount = document.getElementById("resourceCount");
const noResults = document.getElementById("noResults");
const resetSearchButton = document.getElementById("resetSearch");

let selectedCategory = "all";

const initialCards = document.querySelectorAll(".resource-card");

const resourceContainer = initialCards.length
    ? initialCards[0].parentElement
    : null;


/* ==================================
   LOAD SAVED RESOURCES
   ================================== */

function getSavedResources() {
    try {
        const resources = JSON.parse(
            localStorage.getItem("campusResources") || "[]"
        );

        return Array.isArray(resources) ? resources : [];
    } catch (error) {
        console.error("Could not read saved resources:", error);
        return [];
    }
}


/* ==================================
   CREATE SAVED RESOURCE CARDS
   ================================== */

function displaySavedResources() {
    if (!resourceContainer) {
        console.error("Could not find the resource cards container.");
        return;
    }

    // Remove old generated cards before rebuilding them.
    resourceContainer.querySelectorAll(".saved-resource-card").forEach(
        card => card.remove()
    );

    const savedResources = getSavedResources();

    savedResources.forEach(function (resource) {
        const card = document.createElement("article");

        card.className = "resource-card saved-resource-card";

        // This ID opens the correct resource on the details page.
        card.dataset.resourceId = String(resource.id);

        card.dataset.name = (resource.name || "").toLowerCase();
        card.dataset.category = (resource.category || "")
            .toLowerCase()
            .trim();

        card.tabIndex = 0;
        card.setAttribute("role", "link");
        card.setAttribute(
            "aria-label",
            "View details for " + (resource.name || "this resource")
        );
        card.style.cursor = "pointer";

        // Resource image
        const image = document.createElement("img");

        image.className = "resource-image";
        image.alt = resource.name || "Campus resource";

        image.src = resource.image ||
            "https://placehold.co/400x250?text=CampusLend";

        image.onerror = function () {
            image.onerror = null;
            image.src =
                "https://placehold.co/400x250?text=CampusLend";
        };

        // Resource information
        const details = document.createElement("div");
        details.className = "resource-info";

        const name = document.createElement("h3");
        name.textContent = resource.name || "Unnamed Resource";

        const category = document.createElement("p");
        category.textContent =
            "Category: " + (resource.category || "Other");

        const condition = document.createElement("p");
        condition.textContent =
            "Condition: " + (resource.condition || "Not specified");

        const location = document.createElement("p");
        location.textContent =
            "Pickup: " + (resource.location || "Not specified");

        const availability = document.createElement("p");
        availability.textContent =
            "Availability: " + (resource.availability || "Not specified");

        const fee = document.createElement("p");
        fee.textContent =
            "Fee: " + (resource.fee || "0");

        const description = document.createElement("p");
        description.textContent = resource.description || "";

        const viewDetails = document.createElement("p");
        viewDetails.className = "view-details-text";
        viewDetails.textContent = "View Details →";

        details.append(
            name,
            category,
            condition,
            location,
            availability,
            fee,
            description,
            viewDetails
        );

        card.append(image, details);
        resourceContainer.appendChild(card);
    });
}


/* ==================================
   OPEN RESOURCE DETAILS
   ================================== */

function openResourceDetails(card) {
    if (!card || card.hidden) {
        return;
    }

    // Saved resources use their stored IDs.
    const savedResourceId = card.dataset.resourceId;

    if (savedResourceId) {
        window.location.href =
            "item-details.html?item=" +
            encodeURIComponent(savedResourceId);

        return;
    }

    // If a sample card already has a details link,
    // allow its existing link to work normally.
    const existingLink = card.matches("a[href]")
        ? card
        : card.querySelector('a[href*="item-details.html"]');

    if (existingLink) {
        window.location.href = existingLink.href;
        return;
    }

    // For sample cards without a link, use an existing item ID.
    const sampleId =
        card.dataset.resourceId ||
        card.dataset.itemId ||
        card.dataset.id;

    if (sampleId) {
        window.location.href =
            "item-details.html?item=" +
            encodeURIComponent(sampleId);
    } else {
        console.warn(
            "This sample card needs a resource ID or an existing details link."
        );
    }
}


// Handle clicks on saved cards and sample cards.
if (resourceContainer) {
    resourceContainer.addEventListener("click", function (event) {
        if (event.target.closest("a, button, input, select, textarea")) {
            return;
        }

        const card = event.target.closest(".resource-card");

        if (card) {
            openResourceDetails(card);
        }
    });

    // Allow keyboard users to open cards with Enter or Space.
    resourceContainer.addEventListener("keydown", function (event) {
        const card = event.target.closest(".saved-resource-card");

        if (!card || (event.key !== "Enter" && event.key !== " ")) {
            return;
        }

        event.preventDefault();
        openResourceDetails(card);
    });
}


/* ==================================
   SEARCH AND CATEGORY FILTERS
   ================================== */

function filterResources() {
    const searchTerm = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const allResourceCards =
        document.querySelectorAll(".resource-card");

    let visibleCount = 0;

    allResourceCards.forEach(function (card) {
        const resourceName =
            (card.dataset.name || "").toLowerCase();

        const resourceCategory =
            (card.dataset.category || "").toLowerCase().trim();

        const cardText = card.textContent.toLowerCase();

        const matchesSearch =
            resourceName.includes(searchTerm) ||
            cardText.includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            resourceCategory === selectedCategory.toLowerCase();

        const shouldDisplay = matchesSearch && matchesCategory;

        card.hidden = !shouldDisplay;

        if (shouldDisplay) {
            visibleCount++;
        }
    });

    if (resourceCount) {
        resourceCount.textContent = visibleCount;
    }

    if (noResults) {
        noResults.hidden = visibleCount !== 0;
    }
}


/* ==================================
   CATEGORY BUTTONS
   ================================== */

categoryButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        selectedCategory = button.dataset.category || "all";

        categoryButtons.forEach(function (categoryButton) {
            const isActive = categoryButton === button;

            categoryButton.classList.toggle("active", isActive);

            categoryButton.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });

        filterResources();
    });
});


/* ==================================
   SEARCH EVENTS
   ================================== */

if (searchInput) {
    searchInput.addEventListener("input", filterResources);

    searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            filterResources();
        }
    });
}

if (searchButton) {
    searchButton.addEventListener("click", filterResources);
}


/* ==================================
   RESET FILTERS
   ================================== */

if (resetSearchButton) {
    resetSearchButton.addEventListener("click", function () {
        if (searchInput) {
            searchInput.value = "";
        }

        selectedCategory = "all";

        categoryButtons.forEach(function (button) {
            const isActive = button.dataset.category === "all";

            button.classList.toggle("active", isActive);

            button.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });

        filterResources();
    });
}


/* ==================================
   INITIALIZE PAGE
   ================================== */

displaySavedResources();
filterResources();
