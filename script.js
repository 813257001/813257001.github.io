
const STORAGE_KEY = "thoughtly_posts_v1";

// Your ORIGINAL school project post.
// It is automatically added the first time the website runs.

const originalPost = {
    id: "original-post",
    author: "Mohtad Abdullah Qutab",
    title: "A little inspiration goes a long way.",
    text: "What do you think about this quote?",
    image: "quote.jpg",
    date: "Original post",
    likes: 0,
    liked: false,
    original: true
};

const feed = document.getElementById("feed");
const form = document.getElementById("postForm");
const imageInput = document.getElementById("postImage");
const preview = document.getElementById("imagePreview");

let posts = loadPosts();
let selectedImage = "";

// LOAD SAVED POSTS

function loadPosts() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed)) {
                // Preserve the original post even if old saved
                // data does not contain it.
                if (!parsed.some(p => p.id === originalPost.id)) {
                    parsed.push(originalPost);
                }

                return parsed;
            }
        }
    } catch (error) {
        console.error("Could not load posts:", error);
    }

    return [originalPost];
}

// SAVE POSTS

function savePosts() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        return true;
    } catch (error) {
        alert("Storage is full. Try using a smaller image.");
        console.error(error);
        return false;
    }
}

// CREATE AN ELEMENT SAFELY

function makeElement(tag, className, content) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (content !== undefined) {
        element.textContent = content;
    }

    return element;
}

// DISPLAY POSTS

function renderPosts() {
    feed.replaceChildren();

    const sortedPosts = [...posts].reverse();

    document.getElementById("postCount").textContent =
        `${posts.length} ${posts.length === 1 ? "post" : "posts"}`;

    if (sortedPosts.length === 0) {
        feed.append(
            makeElement("div", "empty-feed", "No posts yet. Be the first to share something!")
        );
        return;
    }

    sortedPosts.forEach(post => {
        const card = makeElement("article", "post");

        // HEADER

        const header = makeElement("div", "post-header");

        const avatar = makeElement(
            "div",
            "avatar",
            post.author.charAt(0).toUpperCase()
        );

        const authorInfo = document.createElement("div");

        authorInfo.append(
            makeElement("div", "post-author", post.author),
            makeElement("div", "post-date", post.date)
        );

        header.append(avatar, authorInfo);

        // CONTENT

        const body = makeElement("div", "post-body");

        body.append(
            makeElement("h3", "", post.title),
            makeElement("p", "", post.text)
        );

        // IMAGE

        if (post.image) {
            const img = document.createElement("img");
            img.className = "post-image";
            img.src = post.image;
            img.alt = post.title;
            img.loading = "lazy";

            card.append(header, img, body);
        } else {
            card.append(header, body);
        }

        // LIKE COUNT

        const stats = makeElement("div", "post-stats");

        stats.append(
            makeElement(
                "span",
                "",
                `❤️ ${post.likes} ${post.likes === 1 ? "like" : "likes"}`
            )
        );

        // ACTION BUTTONS

        const actions = makeElement("div", "post-actions");

        const likeButton = makeElement(
            "button",
            `action-btn ${post.liked ? "liked" : ""}`,
            post.liked ? "❤️ Liked" : "♡ Like"
        );

        likeButton.type = "button";

        likeButton.addEventListener("click", () => {
            toggleLike(post.id);
        });

        actions.append(likeButton);

        // Original post is protected from deletion.

        if (!post.original) {
            const deleteButton = makeElement(
                "button",
                "delete-btn",
                "Delete post"
            );

            deleteButton.type = "button";

            deleteButton.addEventListener("click", () => {
                deletePost(post.id);
            });

            actions.append(deleteButton);
        }

        card.append(stats, actions);
        feed.append(card);
    });
}

// LIKE / UNLIKE

function toggleLike(id) {
    const post = posts.find(p => p.id === id);

    if (!post) return;

    if (post.liked) {
        post.likes = Math.max(0, post.likes - 1);
        post.liked = false;
    } else {
        post.likes++;
        post.liked = true;
    }

    if (savePosts()) {
        renderPosts();
    }
}

// DELETE POSTS

function deletePost(id) {
    const post = posts.find(p => p.id === id);

    if (!post || post.original) return;

    if (!confirm("Are you sure you want to delete this post?")) {
        return;
    }

    posts = posts.filter(p => p.id !== id);

    if (savePosts()) {
        renderPosts();
    }
}

// IMAGE PREVIEW

imageInput.addEventListener("change", () => {
    preview.replaceChildren();
    selectedImage = "";

    const file = imageInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select an image.");
        imageInput.value = "";
        return;
    }

    if (file.size > 1024 * 1024) {
        alert("Please choose an image smaller than 1 MB.");
        imageInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        selectedImage = reader.result;

        const img = document.createElement("img");
        img.src = selectedImage;
        img.alt = "Image preview";

        preview.append(img);
    };

    reader.readAsDataURL(file);
});

// CREATE A NEW POST

form.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("postTitle").value.trim();
    const text = document.getElementById("postText").value.trim();

    if (!title || !text) {
        alert("Please add a title and some text.");
        return;
    }

    const newPost = {
        id: crypto.randomUUID(),
        author: "Mohtad Abdullah Qutab",
        title: title,
        text: text,
        image: selectedImage,
        date: new Date().toLocaleString(),
        likes: 0,
        liked: false,
        original: false
    };

    posts.push(newPost);

    if (!savePosts()) {
        posts.pop();
        return;
    }

    form.reset();
    preview.replaceChildren();
    selectedImage = "";

    renderPosts();

    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
    });
});

// START WEBSITE

renderPosts();
