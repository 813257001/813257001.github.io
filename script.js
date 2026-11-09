
// ==========================================
// THOUGHTLY - SOCIAL NETWORK
// ==========================================

// 1. SUPABASE CONFIGURATION
// Replace these two values with your own Supabase credentials.


const SUPABASE_URL = "https://sayfzjtlrjthmmqauelx.supabase.co";

const SUPABASE_KEY = "sb_publishable_SjVSkZCEJQe4JUFO4bU_uQ_sXG0ykZs";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// 2. APP STATE

let currentUser = null;
let currentProfile = null;
let currentMode = "login";
let currentFilter = "all";
let currentSearch = "";
let posts = [];
let likedPosts = new Set();
let toastTimer = null;

// 3. ELEMENTS

const $ = id => document.getElementById(id);

const authScreen = $("authScreen");
const app = $("app");
const authForm = $("authForm");
const authMessage = $("authMessage");
const feed = $("feed");

// 4. UTILITIES

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function formatDate(date) {
  const value = new Date(date);
  return value.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function setLoading(message) {
  feed.innerHTML = `<div class="loading">${escapeHTML(message)}</div>`;
}

// 5. AUTHENTICATION UI

function setAuthMode(mode) {
  currentMode = mode;

  $("loginTab").classList.toggle("active", mode === "login");
  $("signupTab").classList.toggle("active", mode === "signup");

  $("usernameField").classList.toggle("hidden", mode !== "signup");

  $("authSubmit").textContent =
    mode === "login" ? "Log in" : "Create account";

  authMessage.textContent = "";
}

$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("signupTab").addEventListener("click", () => setAuthMode("signup"));

authForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;
  const username = $("usernameInput").value.trim().toLowerCase();

  const button = $("authSubmit");

  button.disabled = true;
  button.textContent = "Please wait...";
  authMessage.textContent = "";

  try {
    if (currentMode === "signup") {
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        throw new Error(
          "Username must be 3-24 characters (letters, numbers and underscores)."
        );
      }

      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });

      if (error) throw error;

      if (!data.session) {
        authMessage.style.color = "var(--green)";
        authMessage.textContent =
          "Account created! Check your email to confirm your account.";
      } else {
        showToast("Welcome to Thoughtly!");
      }
    } else {
      const { error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    }
  } catch (error) {
    authMessage.style.color = "#d34c4c";
    authMessage.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent =
      currentMode === "login" ? "Log in" : "Create account";
  }
});

// 6. SESSION MANAGEMENT

async function initializeApp() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    showToast(error.message);
    return;
  }

  if (data.session) {
    await loadUser(data.session.user);
  } else {
    showAuth();
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      currentProfile = null;
      showAuth();
    }

    if (event === "SIGNED_IN" && session) {
      loadUser(session.user);
    }
  });
}

function showAuth() {
  authScreen.classList.remove("hidden");
  app.classList.add("hidden");
}

async function loadUser(user) {
  currentUser = user;

  const { data: profile, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    showToast("Couldn't load your profile: " + error.message);
    return;
  }

  currentProfile = profile;

  authScreen.classList.add("hidden");
  app.classList.remove("hidden");

  updateProfileUI();
  await loadFeed();
}

function updateProfileUI() {
  const name = currentProfile.username || "User";
  const avatar = initials(name);

  $("sideName").textContent = name;
  $("sideUsername").textContent = "@" + name;
  $("sideAvatar").textContent = avatar;
  $("composerAvatar").textContent = avatar;
  $("profileBtn").textContent = avatar;
}

// 7. LOG OUT

$("logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) showToast(error.message);
  else showToast("Logged out successfully.");
});

// 8. CREATE POSTS

$("postInput").addEventListener("input", event => {
  $("charCount").textContent =
    `${event.target.value.length} / 3000`;
});

$("publishBtn").addEventListener("click", createPost);

async function createPost() {
  const content = $("postInput").value.trim();

  if (!content) {
    showToast("Write something first!");
    return;
  }

  if (content.length > 3000) {
    showToast("Your post is too long.");
    return;
  }

  const button = $("publishBtn");
  button.disabled = true;
  button.textContent = "Publishing...";

  try {
    const { error } = await db
      .from("posts")
      .insert({
        user_id: currentUser.id,
        content: content
      });

    if (error) throw error;

    $("postInput").value = "";
    $("charCount").textContent = "0 / 3000";

    showToast("Your post is live! 🌱");
    await loadFeed();

  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "＋ Publish post";
  }
}

// 9. LOAD FEED

async function loadFeed() {
  setLoading("Loading community posts...");

  try {
    const { data: postData, error } = await db
      .from("posts")
      .select(`
        *,
        profiles!posts_user_id_fkey(username)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    posts = postData || [];

    const { data: likeData, error: likeError } = await db
      .from("likes")
      .select("post_id")
      .eq("user_id", currentUser.id);

    if (likeError) throw likeError;

    likedPosts = new Set(
      (likeData || []).map(item => item.post_id)
    );

    renderFeed();

  } catch (error) {
    feed.innerHTML = `
      <div class="empty-state">
        Couldn't load the feed.<br><br>
        ${escapeHTML(error.message)}
      </div>
    `;
  }
}

// 10. RENDER POSTS

function renderFeed() {
  let filtered = [...posts];

  if (currentFilter === "mine") {
    filtered = filtered.filter(
      post => post.user_id === currentUser.id
    );
  }

  if (currentFilter === "liked") {
    filtered = filtered.filter(
      post => likedPosts.has(post.id)
    );
  }

  if (currentSearch) {
    filtered = filtered.filter(post => {
      const username = post.profiles?.username || "";

      return (
        post.content.toLowerCase().includes(currentSearch) ||
        username.toLowerCase().includes(currentSearch)
      );
    });
  }

  if (!filtered.length) {
    feed.innerHTML = `
      <div class="empty-state">
        <div style="font-size:35px;margin-bottom:12px">🌱</div>
        <strong>Nothing here just yet.</strong>
        <p style="margin-top:8px">
          Be the first to share something!
        </p>
      </div>
    `;
    return;
  }

  feed.innerHTML = filtered.map(post => {
    const username = post.profiles?.username || "User";
    const liked = likedPosts.has(post.id);
    const isOwner = post.user_id === currentUser.id;

    return `
      <article class="post-card" data-post="${escapeHTML(post.id)}">

        <div class="post-header">
          <div class="avatar">${escapeHTML(initials(username))}</div>

          <div class="post-author">
            <strong>${escapeHTML(username)}</strong>
            <small>${escapeHTML(formatDate(post.created_at))}</small>
          </div>

          ${isOwner ? `
            <button class="post-menu delete-post"
              data-id="${escapeHTML(post.id)}"
              title="Delete post">⋯</button>
          ` : ""}
        </div>

        <div class="post-body">${escapeHTML(post.content)}</div>

        <div class="post-stats">
          <span class="like-count">💚 ${post.like_count || 0} likes</span>
          <span class="comment-count">Comments</span>
        </div>

        <div class="post-actions">
          <button
            class="post-action like-btn ${liked ? "liked" : ""}"
            data-id="${escapeHTML(post.id)}">
            ${liked ? "💚 Liked" : "♡ Like"}
          </button>

          <button
            class="post-action comment-toggle"
            data-id="${escapeHTML(post.id)}">
            💬 Comment
          </button>
        </div>

        <div class="comments hidden" id="comments-${escapeHTML(post.id)}">
          <div class="comment-list">
            <div class="loading">Loading comments...</div>
          </div>

          <form class="comment-form" data-id="${escapeHTML(post.id)}">
            <input name="comment"
              maxlength="1000"
              placeholder="Write a comment..."
              required>
            <button type="submit">Send</button>
          </form>
        </div>

      </article>
    `;
  }).join("");
}

// 11. LIKE / UNLIKE POSTS

async function toggleLike(postId, button) {
  button.disabled = true;

  const alreadyLiked = likedPosts.has(postId);

  try {
    if (alreadyLiked) {
      const { error } = await db
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUser.id);

      if (error) throw error;

    } else {
      const { error } = await db
        .from("likes")
        .insert({
          post_id: postId,
          user_id: currentUser.id
        });

      if (error) throw error;
    }

    // Refresh from the shared database.
    await loadFeed();

  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

// 12. DELETE POSTS

async function deletePost(postId) {
  if (!confirm("Are you sure you want to delete this post?")) {
    return;
  }

  try {
    const { error } = await db
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", currentUser.id);

    if (error) throw error;

    showToast("Post deleted.");
    await loadFeed();

  } catch (error) {
    showToast(error.message);
  }
}

// 13. COMMENTS

async function loadComments(postId) {
  const container = $(`comments-${postId}`);

  if (!container) return;

  const list = container.querySelector(".comment-list");

  const { data, error } = await db
    .from("comments")
    .select(`
      *,
      profiles!comments_user_id_fkey(username)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    list.textContent = "Couldn't load comments.";
    return;
  }

  if (!data.length) {
    list.innerHTML = `
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px">
        No comments yet. Start the conversation!
      </p>
    `;
    return;
  }

  list.innerHTML = data.map(comment => {
    const username = comment.profiles?.username || "User";

    return `
      <div class="comment">
        <div class="avatar">${escapeHTML(initials(username))}</div>
        <div class="comment-bubble">
          <strong>${escapeHTML(username)}</strong>
          ${escapeHTML(comment.content)}
        </div>
      </div>
    `;
  }).join("");
}

async function addComment(postId, content) {
  const { error } = await db
    .from("comments")
    .insert({
      post_id: postId,
      user_id: currentUser.id,
      content: content
    });

  if (error) {
    showToast(error.message);
    return;
  }

  showToast("Comment posted!");
  await loadComments(postId);
}

// 14. FEED INTERACTIONS

feed.addEventListener("click", async event => {
  const likeButton = event.target.closest(".like-btn");
  const deleteButton = event.target.closest(".delete-post");
  const commentButton = event.target.closest(".comment-toggle");

  if (likeButton) {
    await toggleLike(likeButton.dataset.id, likeButton);
  }

  if (deleteButton) {
    await deletePost(deleteButton.dataset.id);
  }

  if (commentButton) {
    const postId = commentButton.dataset.id;
    const container = $(`comments-${postId}`);

    container.classList.toggle("hidden");

    if (!container.classList.contains("hidden")) {
      await loadComments(postId);
    }
  }
});

feed.addEventListener("submit", async event => {
  const form = event.target.closest(".comment-form");

  if (!form) return;

  event.preventDefault();

  const postId = form.dataset.id;
  const input = form.elements.comment;
  const content = input.value.trim();

  if (!content) return;

  input.disabled = true;

  try {
    await addComment(postId, content);
    input.value = "";
  } finally {
    input.disabled = false;
  }
});

// 15. NAVIGATION

function setFilter(filter, title) {
  currentFilter = filter;
  $("feedTitle").textContent = title;

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  renderFeed();
}

$("feedNav").addEventListener("click", () => {
  setFilter("all", "Your feed");
});

$("myPostsNav").addEventListener("click", () => {
  setFilter("mine", "Your posts");
});

$("likedNav").addEventListener("click", () => {
  setFilter("liked", "Liked posts");
});

$("homeBtn").addEventListener("click", () => {
  setFilter("all", "Your feed");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

$("aboutNav").addEventListener("click", () => {
  alert(
    "Thoughtly is a community where everyone has a voice. Share your thoughts, meet people and grow together. 💚"
  );
});

$("profileBtn").addEventListener("click", () => {
  setFilter("mine", "Your posts");
});

// 16. SEARCH

$("searchInput").addEventListener("input", event => {
  currentSearch = event.target.value.trim().toLowerCase();
  renderFeed();
});

// 17. DARK MODE

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "thoughtly-theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
});

if (localStorage.getItem("thoughtly-theme") === "dark") {
  document.body.classList.add("dark");
}

// 18. LIVE UPDATES

let realtimeChannel = null;

function startRealtime() {
  if (realtimeChannel) {
    db.removeChannel(realtimeChannel);
  }

  realtimeChannel = db
    .channel("thoughtly-community")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts" },
      () => loadFeed()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "likes" },
      () => loadFeed()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments" },
      event => {
        const postId = event.new?.post_id || event.old?.post_id;

        if (postId) {
          const container = $(`comments-${postId}`);

          if (container && !container.classList.contains("hidden")) {
            loadComments(postId);
          }
        }
      }
    )
    .subscribe();
}

// 19. START

async function startThoughtly() {
  await initializeApp();

  if (currentUser) {
    startRealtime();
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      setTimeout(startRealtime, 0);
    }

    if (event === "SIGNED_OUT") {
      if (realtimeChannel) {
        db.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    }
  });
}

startThoughtly();
