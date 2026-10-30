
/* CampusLend - Add Resource Page */

const resourceForm = document.getElementById("resourceForm");
const imageInput = document.getElementById("resourceImage");
const imagePreview = document.getElementById("imagePreview");
const previewContainer = document.getElementById("imagePreviewContainer");
const fileName = document.getElementById("fileName");
const removeImageButton = document.getElementById("removeImage");
const formMessage = document.getElementById("formMessage");

// Show a preview when an image is selected
if (imageInput) {
    imageInput.addEventListener("change", function () {
        const file = imageInput.files[0];

        if (!file) {
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Please select an image smaller than 2 MB.");
            imageInput.value = "";
            return;
        }

        if (fileName) {
            fileName.textContent = file.name;
        }

        const reader = new FileReader();

        reader.onload = function () {
            imagePreview.src = reader.result;

            if (previewContainer) {
                previewContainer.classList.remove("hidden");
            }
        };

        reader.readAsDataURL(file);
    });
}

// Remove the selected image
if (removeImageButton) {
    removeImageButton.addEventListener("click", function () {
        imageInput.value = "";
        imagePreview.src = "";

        if (previewContainer) {
            previewContainer.classList.add("hidden");
        }

        if (fileName) {
            fileName.textContent = "No image selected";
        }
    });
}

// Submit and save the resource
if (resourceForm) {
    resourceForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const resource = {
            id: Date.now(),
            name: document.getElementById("resourceName").value.trim(),
            category: document.getElementById("category").value,
            condition: document.getElementById("condition").value,
            description: document.getElementById("description").value.trim(),
            availability: document.getElementById("availability").value,
            fee: document.getElementById("fee").value || "0",
            maxDuration: document.getElementById("maxDays").value,
            location: document.getElementById("location").value.trim(),
            image: ""
        };

        function saveResource(imageData) {
            resource.image = imageData;

            try {
                const resources = JSON.parse(
                    localStorage.getItem("campusResources") || "[]"
                );

                resources.push(resource);

                localStorage.setItem(
                    "campusResources",
                    JSON.stringify(resources)
                );

                if (formMessage) {
                    formMessage.textContent =
                        "Resource added successfully! Visit Browse Resources to see your listing.";
                    formMessage.classList.remove("error");
                    formMessage.classList.add("success");
                } else {
                    alert("Resource added successfully!");
                }

                resourceForm.reset();

                if (imagePreview) {
                    imagePreview.removeAttribute("src");
                }

                if (previewContainer) {
                    previewContainer.classList.add("hidden");
                }

                if (fileName) {
                    fileName.textContent = "No image selected";
                }

            } catch (error) {
                console.error("Unable to save resource:", error);

                if (formMessage) {
                    formMessage.textContent =
                        "Could not save the resource. Try a smaller image or remove the image and submit again.";
                    formMessage.classList.add("error");
                } else {
                    alert("Could not save the resource. Try a smaller image.");
                }
            }
        }

        const selectedImage = imageInput.files[0];

        if (selectedImage) {
            const reader = new FileReader();

            reader.onload = function () {
                saveResource(reader.result);
            };

            reader.onerror = function () {
                alert("Could not read the selected image. Please try again.");
            };

            reader.readAsDataURL(selectedImage);
        } else {
            saveResource("");
        }
    });
}
