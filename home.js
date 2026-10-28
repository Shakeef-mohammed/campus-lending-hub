const items = [
    {
        name: "Scientific Calculator",
        category: "Calculators",
        location: "Faculty of Computing",
        owner: "Student A",
        available: true
    },
    {
        name: "Dell Laptop",
        category: "Laptops",
        location: "Library",
        owner: "Student B",
        available: true
    },
    {
        name: "Programming Textbook",
        category: "Textbooks",
        location: "Library",
        owner: "Student C",
        available: true
    },
    {
        name: "Canon Camera",
        category: "Cameras",
        location: "Faculty of Applied Sciences",
        owner: "Student D",
        available: false
    },
    {
        name: "Badminton Racket Set",
        category: "Sports Equipment",
        location: "Student Center",
        owner: "Student E",
        available: true
    },
    {
        name: "Extension Cable",
        category: "Accessories",
        location: "Faculty of Computing",
        owner: "Student F",
        available: true
    }
];

const itemsGrid = document.getElementById("itemsGrid");
const emptyMessage = document.getElementById("emptyMessage");

function displayItems(list) {
    itemsGrid.innerHTML = "";

    emptyMessage.hidden = list.length !== 0;

    list.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";

        const title = document.createElement("h3");
        title.textContent = item.name;

        const category = document.createElement("p");
        category.textContent = "Category: " + item.category;

        const location = document.createElement("p");
        location.textContent = "Location: " + item.location;

        const owner = document.createElement("p");
        owner.textContent = "Owner: " + item.owner;

        const status = document.createElement("p");
        status.textContent = item.available ? "Available" : "Currently Borrowed";

        const button = document.createElement("button");
        button.textContent = item.available ? "Request to Borrow" : "Currently Borrowed";
        button.disabled = !item.available;

        button.addEventListener("click", () => {
            const user = localStorage.getItem("campusShareUser");

            if (!user) {
                window.location.href = "login.html";
            } else {
                alert("Borrowing request demo. A backend is needed to save real requests.");
            }
        });

        card.append(title, category, location, owner, status, button);
        itemsGrid.appendChild(card);
    });
}

function searchItems() {
    const query = document.getElementById("searchInput")
        .value.trim().toLowerCase();

    const results = items.filter(item =>
        (item.name + " " + item.category + " " + item.location)
            .toLowerCase().includes(query)
    );

    displayItems(results);
}

function filterCategory(selectedCategory) {
    document.getElementById("searchInput").value = "";

    displayItems(
        items.filter(item => item.category === selectedCategory)
    );

    document.getElementById("items").scrollIntoView({
        behavior: "smooth"
    });
}

displayItems(items);
