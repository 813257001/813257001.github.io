
import { initializeApp } from
"https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
    getFirestore,
    doc,
    onSnapshot,
    runTransaction
} from
"https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Replace these values with your Firebase project details
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// This is the shared post
const postRef = doc(db, "posts", "quote");

const likeCount = document.getElementById("likeCount");
const likeButton = document.getElementById("likeButton");
const thanks = document.getElementById("thanks");

// Listen for updates from every device
onSnapshot(postRef, (snapshot) => {
    if (snapshot.exists()) {
        const likes = snapshot.data().likes || 0;

        likeCount.textContent =
            likes + (likes === 1 ? " like" : " likes");
    } else {
        likeCount.textContent = "Post not set up";
    }
});

// Every click adds one like
window.likePost = async function () {
    likeButton.disabled = true;
    thanks.textContent = "Adding your like...";

    try {
        await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(postRef);

            if (!snapshot.exists()) {
                throw new Error("Post does not exist!");
            }

            const currentLikes = snapshot.data().likes || 0;

            transaction.update(postRef, {
                likes: currentLikes + 1
            });
        });

        thanks.textContent = "❤️ Thanks for supporting this quote!";

    } catch (error) {
        console.error(error);
        thanks.textContent = "Something went wrong. Try again.";
    } finally {
        likeButton.disabled = false;
    }
};

