
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// THOUGHTLY SUPABASE CONNECTION
const SUPABASE_URL = "https://ihoxyqbwhnewsqvqztrs.supabase.co";
const SUPABASE_KEY = "sb_publishable_z32vgR2Xv_ZS8Pbkqjm5Pw_z53hK4Qw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);

let mode = "login";
let currentUser = null;

// Switch between login and registration.
function setMode(newMode) {
  mode = newMode;

  $("loginTab").classList.toggle("active", mode === "login");
  $("signupTab").classList.toggle("active", mode === "signup");
  $("usernameField").classList.toggle("hidden", mode !== "signup");

  $("username").required = mode === "signup";
  $("password").autocomplete =
    mode === "signup" ? "new-password" : "current-password";

  $("authSubmit").textContent =
    mode === "signup" ? "Create account" : "Log in";

  $("authMessage").textContent = "";
}

$("loginTab").addEventListener("click", () => setMode("login"));
$("signupTab").addEventListener("click", () => setMode("signup"));

// Register and log in.
$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;
  const username = $("username").value.trim().toLowerCase();

  $("authSubmit").disabled = true;
  $("authMessage").textContent = "Please wait...";

  try {
    if (mode === "signup") {
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        throw new Error(
          "Username must be 3–24 characters using letters, numbers or underscores."
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (data.session) {
        $("authMessage").textContent = "Account created!";
        await showApp(data.session.user);
      } else {
        $("authMessage").textContent =
          "Account created! Check your email for a confirmation link before logging in.";
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      await showApp(data.user);
    }
  } catch (error) {
    $("authMessage").textContent = error.message;
  } finally {
    $("authSubmit").disabled = false;
  }
});

// Display the logged-in application.
async function showApp(user) {
  currentUser = user;

  $("authSection").classList.add("hidden");
  $("appSection").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");

  await loadProfile();
  await loadPosts();
}

// Load profile information.
async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    $("currentUsername").textContent = "My account";
    return;
  }

  $("currentUsername").textContent = "@" + data.username;
}

// Publish a thought.
$("postForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const content = $("postContent").value.trim();
  if (!content || !currentUser) return;

  const button = $("postForm").querySelector("button");
  button.disabled = true;
  $("postMessage").textContent = "Publishing...";

  try {
    const { error } = await supabase.from("posts").insert({
      user_id: currentUser.id,
      content
    });

    if (error) throw error;

    $("postContent").value = "";
    $("postMessage").textContent = "Your thought has been published!";
    await loadPosts();
  } catch (error) {
    $("postMessage").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

// Load the shared community feed.
async function loadPosts() {
  $("posts").textContent = "Loading thoughts...";

  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, user_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!posts || posts.length === 0) {
      $("posts").textContent = "No thoughts yet. Be the first to share!";
      return;
    }

    const userIds = [...new Set(posts.map(post => post.user_id))];

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    if (profileError) throw profileError;

    const usernames = new Map(
      profiles.map(profile => [profile.id, profile.username])
    );

    const container = $("posts");
    container.replaceChildren();

    posts.forEach(post => {
      const article = document.createElement("article");
      article.className = "post";

      const header = document.createElement("div");
      header.className = "post-header";

      const username = document.createElement("span");
      username.className = "post-user";
      username.textContent =
        "@" + (usernames.get(post.user_id) || "thoughtly_user");

      const date = document.createElement("span");
      date.className = "post-date";
      date.textContent = new Date(post.created_at).toLocaleString();

      header.append(username, date);

      const content = document.createElement("p");
      content.className = "post-content";
      content.textContent = post.content;

      article.append(header, content);

      if (currentUser && currentUser.id === post.user_id) {
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete post";

        deleteButton.addEventListener("click", async () => {
          if (!confirm("Delete this thought?")) return;

          deleteButton.disabled = true;

          const { error } = await supabase
            .from("posts")
            .delete()
            .eq("id", post.id);

          if (error) {
            alert(error.message);
            deleteButton.disabled = false;
            return;
          }

          await loadPosts();
        });

        article.append(deleteButton);
      }

      container.append(article);
    });
  } catch (error) {
    $("posts").textContent = "Couldn't load the feed: " + error.message;
  }
}

// Refresh feed.
$("refreshBtn").addEventListener("click", loadPosts);

// Log out.
$("logoutBtn").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = null;
  $("appSection").classList.add("hidden");
  $("authSection").classList.remove("hidden");
  $("logoutBtn").classList.add("hidden");
  $("authForm").reset();
  $("postMessage").textContent = "";
  $("authMessage").textContent = "";
  setMode("login");
});

// Restore existing login session.
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  await showApp(session.user);
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    currentUser = null;
    $("appSection").classList.add("hidden");
    $("authSection").classList.remove("hidden");
    $("logoutBtn").classList.add("hidden");
  }
});
