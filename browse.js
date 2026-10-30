
import { db } from "../firebase-config.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const resourceGrid = document.getElementById("resourceGrid");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const categoryFilters = document.getElementById("categoryFilters");
const resultCount = document.getElementById("resultCount");
const noResults = document.getElementById("noResults");
const resetSearch = document.getElementById("resetSearch");
const browseMessage = document.getElementById("browseMessage");

let allResources = [];
let selectedCategory = "all";

function showMessage(message, type = "info") {
    browseMessage.textContent = message;
    browseMessage.className = `browse-message ${type}`;
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

function createResourceCard(resource) {
    const card = document.createElement("article");
    card.className = "resource-card";

    const name = escapeHTML(resource.name || "Untitled Resource");
    const category = escapeHTML(resource.category || "Other");
    const condition = escapeHTML(resource.condition || "Not specified");
    const location = escapeHTML(resource.location || "Location not specified");
    const owner = escapeHTML(resource.ownerName || "Campus Member");
    const description = escapeHTML(resource.description || "No description available.");

    card.innerHTML = `
        <div class="resource-image">
            <span class="resource-icon">
                ${getCategoryIcon(resource.category)}
            </span>
            <span class="resource-badge">Available</span>
        </div>

        <div class="resource-content">
            <span class="resource-category">${category}</span>

            <h3>${name}</h3>

            <p class="resource-description">${description}</p>

            <div class="resource-meta">
                <span>Condition: ${condition}</span>
                <span>📍 ${location}</span>
            </div>

            <div class="resource-owner">
                Shared by ${owner}
            </div>

            <div class="resource-card-bottom">
                <strong>${formatFee(resource.fee)}</strong>

                <a href="item-details.html?item=${encodeURIComponent(resource.id)}"
                   class="primary-btn">
                    View Details
                </a>
            </div>
        </div>
    `;

    return card;
}

function renderResources(resources) {
    resourceGrid.innerHTML = "";

    resultCount.textContent =
        `${resources.length} resource${resources.length === 1 ? "" : "s"} found`;

    if (resources.length === 0) {
        noResults.hidden = false;
        return;
    }

    noResults.hidden = true;

    const fragment = document.createDocumentFragment();

    resources.forEach(resource => {
        fragment.appendChild(createResourceCard(resource));
    });

    resourceGrid.appendChild(fragment);
}

function applyFilters() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredResources = allResources.filter(resource => {
        const matchesCategory =
            selectedCategory === "all" ||
            String(resource.category || "").toLowerCase() ===
            selectedCategory.toLowerCase();

        const searchableText = [
            resource.name,
            resource.category,
            resource.description,
            resource.location,
            resource.ownerName,
            resource.condition
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        return matchesCategory && matchesSearch;
    });

    renderResources(filteredResources);
}

async function loadResources() {
    resourceGrid.innerHTML =
        '<div class="loading-message">Loading available resources...</div>';

    noResults.hidden = true;
    resultCount.textContent = "Loading resources...";

    try {
        const itemsQuery = query(
            collection(db, "items"),
            where("available", "==", true)
        );

        const snapshot = await getDocs(itemsQuery);

        allResources = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        allResources.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;

            return dateB - dateA;
        });

        applyFilters();

        if (allResources.length === 0) {
            showMessage("No available resources have been listed yet.");
        } else {
            showMessage("");
        }

    } catch (error) {
        console.error("Error loading resources:", error);

        resourceGrid.innerHTML = "";
        resultCount.textContent = "Unable to load resources.";

        showMessage(
            "Could not load resources. Please check your connection and try again.",
            "error"
        );
    }
}

searchInput.addEventListener("input", applyFilters);

searchButton.addEventListener("click", applyFilters);

categoryFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");

    if (!button) return;

    selectedCategory = button.dataset.category;

    categoryFilters.querySelectorAll("[data-category]").forEach(item => {
        item.classList.toggle("active", item === button);
    });

    applyFilters();
});

resetSearch.addEventListener("click", () => {
    searchInput.value = "";
    selectedCategory = "all";

    categoryFilters.querySelectorAll("[data-category]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.category === "all"
        );
    });

    applyFilters();
});

loadResources();
