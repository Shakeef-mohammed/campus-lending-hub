const storedUser = localStorage.getItem("campusShareUser");

let user = null;

try {
    user = storedUser ? JSON.parse(storedUser) : null;
} catch (error) {
    user = null;
}

if (user && user.name) {
    const name = user.name
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    document.getElementById("welcomeName").textContent = name;
    document.getElementById("userName").textContent = name;
}

document.getElementById("logoutButton").addEventListener("click", function () {
    localStorage.removeItem("campusShareUser");
    window.location.href = "login.html";
});