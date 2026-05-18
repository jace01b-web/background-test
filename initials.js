document.addEventListener("DOMContentLoaded", () => {
    // Create the background element
    const bgElement = document.createElement("div");

    // Apply styles for a fullscreen, blurred, fade-in background
    Object.assign(bgElement.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        zIndex: "-9999", // Keeps it strictly behind the actual website/game
        // Replace the URL below with your desired background image
        background: "url('https://picsum.photos/1920/1080') center/cover no-repeat",
        filter: "blur(15px)",
        transform: "scale(1.1)", // Prevents blur artifact edges from showing plain background
        opacity: "0", // Initial state for fade-in
        transition: "opacity 2s ease-in-out",
        pointerEvents: "none" // Ensures it doesn't intercept clicks meant for the game
    });

    // Append to the body
    document.body.appendChild(bgElement);

    // Trigger the fade-in effect slightly after insertion
    requestAnimationFrame(() => {
        bgElement.style.opacity = "1";
    });
});
