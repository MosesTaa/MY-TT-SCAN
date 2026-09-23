const SUPABASE_URL = "https://smysfznhfhhercnvzetk.supabase.co";
const SUPABASE_KEY = "sb_publishable_jFtrAVjQMUqrBY_pzkYYyg_5SL2bB6U";
const POSTS_URL = `${SUPABASE_URL}/rest/v1/school_posts`;

const form = document.querySelector("#postForm");
const postButton = document.querySelector("#postButton");
const search = document.querySelector("#search");
const postsElement = document.querySelector("#posts");
const message = document.querySelector("#message");
const count = document.querySelector("#count");
const refresh = document.querySelector("#refresh");

let posts = [];

function showMessage(text) {
  message.textContent = text;
}

async function readError(response) {
  const type = response.headers.get("content-type") || "";

  if (type.includes("application/json")) {
    const result = await response.json();
    return result.message || result.error || `Request failed (${response.status}).`;
  }

  return `The server returned an unexpected response (${response.status}).`;
}

function renderPosts() {
  const query = search.value.trim().toLowerCase();

  const matches = posts.filter(post =>
    [
      post.school,
      post.county,
      post.subcounty,
      post.level,
      post.desired_county,
      post.desired_school
    ].some(value => String(value || "").toLowerCase().includes(query))
  );

  count.textContent =
    `${matches.length} ${matches.length === 1 ? "post" : "posts"}`;
  postsElement.replaceChildren();

  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = query
      ? "No schools match your search."
      : "No schools posted yet.";
    postsElement.append(empty);
    return;
  }

  for (const post of matches) {
    const card = document.createElement("article");
    card.className = "post";

    const level = document.createElement("small");
    level.textContent = post.level;

    const school = document.createElement("h3");
    school.textContent = post.school;

    const location = document.createElement("p");
    location.textContent = `${post.subcounty}, ${post.county}`;

    const destination = document.createElement("p");
    destination.textContent =
      `Looking for: ${post.desired_school}, ${post.desired_county}`;

    card.append(level, school, location, destination);
    postsElement.append(card);
  }
}

async function loadPosts() {
  refresh.disabled = true;
  showMessage("Loading schools…");

  try {
    const response = await fetch(
      `${POSTS_URL}?select=school,county,subcounty,level,desired_county,desired_school,created_at&order=created_at.desc&limit=200`,
      { headers: { apikey: SUPABASE_KEY } }
    );

    if (!response.ok) throw new Error(await readError(response));

    const result = await response.json();
    if (!Array.isArray(result)) throw new Error("Unexpected school data.");

    posts = result;
    showMessage("");
    renderPosts();
  } catch (error) {
    showMessage(error.message || "Could not load schools.");
  } finally {
    refresh.disabled = false;
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  postButton.disabled = true;
  showMessage("");

  try {
    const data = Object.fromEntries(new FormData(form));

    const response = await fetch(POSTS_URL, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        school: data.school.trim(),
        county: data.county.trim(),
        subcounty: data.subcounty.trim(),
        level: data.level,
        desired_county: data.desiredCounty.trim(),
        desired_school: data.desiredSchool.trim()
      })
    });

    if (!response.ok) throw new Error(await readError(response));

    form.reset();
    await loadPosts();
    showMessage("Your school has been posted.");
  } catch (error) {
    showMessage(error.message || "Could not post your school.");
  } finally {
    postButton.disabled = false;
  }
});

search.addEventListener("input", renderPosts);
refresh.addEventListener("click", loadPosts);
loadPosts();
