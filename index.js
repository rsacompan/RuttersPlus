document.addEventListener("DOMContentLoaded", () => {
    console.log("Frontend loaded!");

    // Example: Change text in an HTML element
    const heading = document.getElementById("title");
    if (heading) {
        heading.innerText = "Welcome to My Electron App!";
    }
});
