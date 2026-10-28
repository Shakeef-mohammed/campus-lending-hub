
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const message = document.getElementById("message");

togglePassword.addEventListener("click", function () {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "Show";
    }
});

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        message.style.color = "red";
        message.textContent = "Please fill in all fields.";
        return;
    }

    message.style.color = "#187b57";
    message.textContent =
        "Form validated! Connect the backend to sign in.";
});

document.getElementById("forgotLink").addEventListener(
    "click",
    function (event) {
        event.preventDefault();
        message.style.color = "#187b57";
        message.textContent =
            "Password reset will be available soon.";
    }
);
