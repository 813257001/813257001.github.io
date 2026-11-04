
const button = document.getElementById("likeButton");
const counter = document.getElementById("counter");

// Your shared online counter
const COUNTER_URL = "https://abacus.jasoncameron.dev";
const COUNTER_ID = "school-quote-project-84729";

// Load the shared like count
async function loadLikes() {
    try {
        const response = await fetch(
            `${COUNTER_URL}/get/${COUNTER_ID}/likes`
        );

        if (!response.ok) {
            throw new Error("Failed to load likes");
        }

        const data = await response.json();

        counter.textContent =
            `${data.value} ${data.value === 1 ? "Like" : "Likes"}`;

    } catch (error) {
        console.error("Counter error:", error);
        counter.textContent = "Likes unavailable";
    }
}

// Add one like for everyone
button.addEventListener("click", async function () {

    button.disabled = true;
    button.textContent = "❤️ Liking...";

    try {
        const response = await fetch(
            `${COUNTER_URL}/hit/${COUNTER_ID}/likes`
        );

        if (!response.ok) {
            throw new Error("Could not add like");
        }

        const data = await response.json();

        counter.textContent =
            `${data.value} ${data.value === 1 ? "Like" : "Likes"}`;

        button.textContent = "❤️ Liked!";

    } catch (error) {
        console.error("Like error:", error);

        button.textContent = "❤️ Try Again";
        alert("Something went wrong. Please try again.");

    } finally {
        button.disabled = false;
    }
});

// Get the latest count when the website opens
loadLikes();

// Automatically refresh every 5 seconds
setInterval(loadLikes, 5000);
