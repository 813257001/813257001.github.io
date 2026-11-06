
// ======================================
// SUPABASE CONFIGURATION
// ======================================

const SUPABASE_URL = "https://rcynsjgtwtrutmkmgdvw.supabase.co";

const SUPABASE_KEY = "sb_publishable_auW4qNTYQ_6i4ybjVxUfuw_E95x4U72";

// ======================================
// HTML ELEMENTS
// ======================================

const button = document.getElementById("likeButton");
const counter = document.getElementById("likeCount");

// ======================================
// SUPABASE REQUEST
// ======================================

async function apiRequest(path, options = {}) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${path}`,
        {
            ...options,
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                ...options.headers
            }
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Request failed");
    }

    return response.json();
}

// ======================================
// UPDATE THE DISPLAY
// ======================================

function displayLikes(count) {
    const number = Number(count);

    counter.textContent =
        `${number.toLocaleString()} ${number === 1 ? "Like" : "Likes"}`;
}

// ======================================
// LOAD SHARED LIKE COUNT
// ======================================

async function loadLikes() {
    try {
        const data = await apiRequest(
            "like_counter?id=eq.1&select=count"
        );

        if (data.length > 0) {
            displayLikes(data[0].count);
        }
    } catch (error) {
        console.error("Could not load likes:", error);
    }
}

// ======================================
// ADD A LIKE
// ======================================

async function likePost() {
    if (button.disabled) return;

    button.disabled = true;

    try {
        const data = await apiRequest(
            "rpc/increment_likes",
            {
                method: "POST",
                body: JSON.stringify({})
            }
        );

        displayLikes(data);

        button.classList.add("liked");
    } catch (error) {
        console.error("Could not add like:", error);
        alert("Couldn't save your like. Please try again.");
    } finally {
        button.disabled = false;
    }
}

// ======================================
// INITIALIZE
// ======================================

if (button && counter) {
    button.addEventListener("click", likePost);

    loadLikes();

    // Refresh shared count every 5 seconds
    setInterval(loadLikes, 5000);
} else {
    console.error("Like button or counter element not found!");
}
