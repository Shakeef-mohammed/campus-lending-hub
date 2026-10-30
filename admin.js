// ========================================
// CAMPUSLEND ADMIN DASHBOARD
// Frontend demonstration using sample data
// ========================================


// ========================================
// 1. SAMPLE STUDENT DATA
// ========================================

const students = [
    {
        id: "STU001",
        name: "Amaya Perera",
        email: "amaya@example.com",
        department: "Software Engineering",
        borrowedItems: 2
    },
    {
        id: "STU002",
        name: "Kasun Fernando",
        email: "kasun@example.com",
        department: "Information Technology",
        borrowedItems: 1
    },
    {
        id: "STU003",
        name: "Nethmi Silva",
        email: "nethmi@example.com",
        department: "Computer Science",
        borrowedItems: 3
    },
    {
        id: "STU004",
        name: "Ravindu Jayasuriya",
        email: "ravindu@example.com",
        department: "Software Engineering",
        borrowedItems: 0
    },
    {
        id: "STU005",
        name: "Tharushi Bandara",
        email: "tharushi@example.com",
        department: "Information Technology",
        borrowedItems: 1
    }
];


// ========================================
// 2. SAMPLE RESOURCE DATA
// ========================================

const resources = [
    {
        id: "RES001",
        name: "Scientific Calculator",
        category: "Electronics",
        owner: "Amaya Perera",
        availability: "Available"
    },
    {
        id: "RES002",
        name: "Introduction to Programming",
        category: "Books",
        owner: "Kasun Fernando",
        availability: "Borrowed"
    },
    {
        id: "RES003",
        name: "Digital Camera",
        category: "Photography",
        owner: "Nethmi Silva",
        availability: "Available"
    },
    {
        id: "RES004",
        name: "Football",
        category: "Sports",
        owner: "Ravindu Jayasuriya",
        availability: "Available"
    },
    {
        id: "RES005",
        name: "Extension Cable",
        category: "Other",
        owner: "Tharushi Bandara",
        availability: "Borrowed"
    },
    {
        id: "RES006",
        name: "Laptop",
        category: "Electronics",
        owner: "Amaya Perera",
        availability: "Available"
    }
];


// ========================================
// 3. SAMPLE BORROWING REQUESTS
// ========================================

const requests = [
    {
        id: "REQ001",
        studentId: "STU001",
        student: "Amaya Perera",
        resource: "Scientific Calculator",
        borrowDate: "2026-10-29",
        returnDate: "2026-10-31",
        status: "Pending"
    },
    {
        id: "REQ002",
        studentId: "STU002",
        student: "Kasun Fernando",
        resource: "Introduction to Programming",
        borrowDate: "2026-10-28",
        returnDate: "2026-11-02",
        status: "Approved"
    },
    {
        id: "REQ003",
        studentId: "STU003",
        student: "Nethmi Silva",
        resource: "Digital Camera",
        borrowDate: "2026-10-30",
        returnDate: "2026-11-01",
        status: "Pending"
    },
    {
        id: "REQ004",
        studentId: "STU004",
        student: "Ravindu Jayasuriya",
        resource: "Football",
        borrowDate: "2026-10-29",
        returnDate: "2026-10-30",
        status: "Rejected"
    },
    {
        id: "REQ005",
        studentId: "STU005",
        student: "Tharushi Bandara",
        resource: "Extension Cable",
        borrowDate: "2026-10-31",
        returnDate: "2026-11-02",
        status: "Pending"
    },
    {
        id: "REQ006",
        studentId: "STU001",
        student: "Amaya Perera",
        resource: "Laptop",
        borrowDate: "2026-11-01",
        returnDate: "2026-11-03",
        status: "Approved"
    }
];


// ========================================
// 4. HELPER FUNCTIONS
// ========================================

// Escape text before inserting sample values into HTML.
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}


// Format a date such as 2026-10-29 as 29 Oct 2026.
function formatDate(dateString) {
    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return escapeHTML(dateString);
    }

    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


// Create a status label.
function getStatusBadge(status) {
    const className = status.toLowerCase();

    return `
        <span class="status ${escapeHTML(className)}">
            ${escapeHTML(status)}
        </span>
    `;
}


// ========================================
// 5. DASHBOARD STATISTICS
// ========================================

function updateStatistics() {
    const totalStudents = students.length;
    const totalResources = resources.length;

    const pendingRequests = requests.filter(
        request => request.status === "Pending"
    ).length;

    const approvedRequests = requests.filter(
        request => request.status === "Approved"
    ).length;

    document.getElementById("totalStudents").textContent =
        totalStudents;

    document.getElementById("totalResources").textContent =
        totalResources;

    document.getElementById("pendingRequests").textContent =
        pendingRequests;

    document.getElementById("approvedRequests").textContent =
        approvedRequests;
}


// ========================================
// 6. DISPLAY RECENT REQUESTS
// ========================================

function renderRecentRequests() {
    const table = document.getElementById("recentRequestsTable");

    const recentRequests = requests.slice(0, 5);

    if (recentRequests.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">
                    No borrowing requests found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = recentRequests.map(request => `
        <tr>
            <td class="primary-text">
                ${escapeHTML(request.id)}
            </td>

            <td>${escapeHTML(request.student)}</td>

            <td>${escapeHTML(request.resource)}</td>

            <td>${formatDate(request.borrowDate)}</td>

            <td>${getStatusBadge(request.status)}</td>
        </tr>
    `).join("");
}


// ========================================
// 7. DISPLAY ALL BORROWING REQUESTS
// ========================================

function renderRequests() {
    const table = document.getElementById("allRequestsTable");

    const searchTerm = document
        .getElementById("requestSearch")
        .value
        .trim()
        .toLowerCase();

    const selectedStatus = document
        .getElementById("requestStatusFilter")
        .value;

    const filteredRequests = requests.filter(request => {
        const matchesSearch =
            request.id.toLowerCase().includes(searchTerm) ||
            request.student.toLowerCase().includes(searchTerm) ||
            request.resource.toLowerCase().includes(searchTerm) ||
            request.studentId.toLowerCase().includes(searchTerm);

        const matchesStatus =
            selectedStatus === "all" ||
            request.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    if (filteredRequests.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">
                    No matching borrowing requests found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = filteredRequests.map(request => {
        const isPending = request.status === "Pending";

        return `
            <tr>
                <td class="primary-text">
                    ${escapeHTML(request.id)}
                </td>

                <td>
                    <div class="primary-text">
                        ${escapeHTML(request.student)}
                    </div>
                    <div class="muted-text">
                        ${escapeHTML(request.studentId)}
                    </div>
                </td>

                <td>${escapeHTML(request.resource)}</td>

                <td>${formatDate(request.borrowDate)}</td>

                <td>${formatDate(request.returnDate)}</td>

                <td>${getStatusBadge(request.status)}</td>

                <td>
                    ${
                        isPending
                            ? `
                                <div class="action-buttons">
                                    <button
                                        class="action-button approve-button"
                                        data-action="approve"
                                        data-id="${escapeHTML(request.id)}"
                                    >
                                        Approve
                                    </button>

                                    <button
                                        class="action-button reject-button"
                                        data-action="reject"
                                        data-id="${escapeHTML(request.id)}"
                                    >
                                        Reject
                                    </button>
                                </div>
                            `
                            : `
                                <span class="muted-text">
                                    No action available
                                </span>
                            `
                    }
                </td>
            </tr>
        `;
    }).join("");
}


// ========================================
// 8. APPROVE OR REJECT REQUESTS
// ========================================

function updateRequestStatus(requestId, newStatus) {
    const request = requests.find(
        item => item.id === requestId
    );

    if (!request) {
        return;
    }

    if (request.status !== "Pending") {
        alert("Only pending requests can be updated.");
        return;
    }

    const actionText = newStatus.toLowerCase();

    const confirmed = window.confirm(
        `Are you sure you want to ${actionText} ${request.id}?`
    );

    if (!confirmed) {
        return;
    }

    request.status = newStatus;

    updateStatistics();
    renderRecentRequests();
    renderRequests();

    alert(
        `Request ${request.id} has been ${actionText} successfully in this demo.`
    );
}


// Use event delegation for the request action buttons.
document.getElementById("allRequestsTable").addEventListener(
    "click",
    function (event) {
        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const requestId = button.dataset.id;
        const action = button.dataset.action;

        if (action === "approve") {
            updateRequestStatus(requestId, "Approved");
        }

        if (action === "reject") {
            updateRequestStatus(requestId, "Rejected");
        }
    }
);


// ========================================
// 9. DISPLAY RESOURCES
// ========================================

function renderResources() {
    const table = document.getElementById("resourcesTable");

    const searchTerm = document
        .getElementById("resourceSearch")
        .value
        .trim()
        .toLowerCase();

    const selectedCategory = document
        .getElementById("resourceCategoryFilter")
        .value;

    const filteredResources = resources.filter(resource => {
        const matchesSearch =
            resource.name.toLowerCase().includes(searchTerm) ||
            resource.category.toLowerCase().includes(searchTerm) ||
            resource.owner.toLowerCase().includes(searchTerm) ||
            resource.id.toLowerCase().includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            resource.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    if (filteredResources.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">
                    No matching resources found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = filteredResources.map(resource => `
        <tr>
            <td class="primary-text">
                ${escapeHTML(resource.id)}
            </td>

            <td class="primary-text">
                ${escapeHTML(resource.name)}
            </td>

            <td>${escapeHTML(resource.category)}</td>

            <td>${escapeHTML(resource.owner)}</td>

            <td>
                ${getStatusBadge(resource.availability)}
            </td>
        </tr>
    `).join("");
}


// ========================================
// 10. DISPLAY STUDENTS
// ========================================

function renderStudents() {
    const table = document.getElementById("studentsTable");

    const searchTerm = document
        .getElementById("studentSearch")
        .value
        .trim()
        .toLowerCase();

    const filteredStudents = students.filter(student => {
        return (
            student.id.toLowerCase().includes(searchTerm) ||
            student.name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm) ||
            student.department.toLowerCase().includes(searchTerm)
        );
    });

    if (filteredStudents.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">
                    No matching students found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = filteredStudents.map(student => `
        <tr>
            <td class="primary-text">
                ${escapeHTML(student.id)}
            </td>

            <td class="primary-text">
                ${escapeHTML(student.name)}
            </td>

            <td>${escapeHTML(student.email)}</td>

            <td>${escapeHTML(student.department)}</td>

            <td>${student.borrowedItems}</td>
        </tr>
    `).join("");
}


// ========================================
// 11. SIDEBAR NAVIGATION
// ========================================

const navigationButtons = document.querySelectorAll(".nav-link");

const dashboardSections = document.querySelectorAll(
    ".dashboard-section"
);

const pageTitle = document.getElementById("pageTitle");

const sectionTitles = {
    overview: "Dashboard Overview",
    requests: "Borrowing Requests",
    resources: "Campus Resources",
    students: "Registered Students"
};


function showSection(sectionId) {
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
        return;
    }

    dashboardSections.forEach(section => {
        section.classList.toggle(
            "active",
            section.id === sectionId
        );
    });

    navigationButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionId
        );
    });

    pageTitle.textContent =
        sectionTitles[sectionId] || "Admin Dashboard";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


navigationButtons.forEach(button => {
    button.addEventListener("click", function () {
        showSection(button.dataset.section);
    });
});


// Handle buttons that navigate to another dashboard section.
document.querySelectorAll("[data-go-to]").forEach(button => {
    button.addEventListener("click", function () {
        showSection(button.dataset.goTo);
    });
});


// ========================================
// 12. SEARCH AND FILTER EVENTS
// ========================================

document.getElementById("requestSearch").addEventListener(
    "input",
    renderRequests
);

document.getElementById("requestStatusFilter").addEventListener(
    "change",
    renderRequests
);

document.getElementById("resourceSearch").addEventListener(
    "input",
    renderResources
);

document.getElementById("resourceCategoryFilter").addEventListener(
    "change",
    renderResources
);

document.getElementById("studentSearch").addEventListener(
    "input",
    renderStudents
);


// ========================================
// 13. INITIALIZE THE DASHBOARD
// ========================================

function initializeDashboard() {
    updateStatistics();
    renderRecentRequests();
    renderRequests();
    renderResources();
    renderStudents();
}

initializeDashboard();
