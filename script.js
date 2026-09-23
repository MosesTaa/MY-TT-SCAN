const config = {
  paystackPublicKey: "pk_live_e440f2ef3197a5e86a27bef5c97c388bd6c35bf4",
  supabasePublishableKey: "sb_publishable_jFtrAVjQMUqrBY_pzkYYyg_5SL2bB6U"
};
const postForm = document.querySelector("#postForm");
const paymentForm = document.querySelector("#paymentForm");
const schoolBoard = document.querySelector("#schoolBoard");
const postsElement = document.querySelector("#posts");
const message = document.querySelector("#message");
const searchInput = document.querySelector("#search");
const count = document.querySelector("#count");

let posts = [];

function showMessage(text) {
  message.textContent = text;
}

function renderPosts() {
  const query = searchInput.value.trim().toLowerCase();
  const matches = posts.filter(post =>
    [
      post.school, post.county, post.subcounty, post.level,
      post.desiredCounty, post.desiredSchool
    ].some(value => String(value || "").toLowerCase().includes(query))
  );

  count.textContent = `${matches.length} ${matches.length === 1 ? "post" : "posts"}`;
  postsElement.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.textContent = query ? "No schools match your search." : "No schools posted yet.";
    postsElement.append(empty);
    return;
  }

  for (const post of matches) {
    const card = document.createElement("article");
    card.className = "post";

    const level = document.createElement("small");
    level.textContent = post.level;

    const name = document.createElement("h3");
    name.textContent = post.school;

    const location = document.createElement("p");
    location.textContent = `${post.subcounty}, ${post.county}`;

    const destination = document.createElement("div");
    destination.className = "destination";

    const caption = document.createElement("small");
    caption.textContent = "LOOKING FOR";

    const desiredSchool = document.createElement("strong");
    desiredSchool.textContent = post.desiredSchool;

    const desiredCounty = document.createElement("small");
    desiredCounty.textContent = `${post.desiredCounty} County`;

    destination.append(caption, desiredSchool, desiredCounty);
    card.append(level, name, location, destination);
    postsElement.append(card);
  }
}

async function loadPosts() {
  try {
    const response = await fetch("/api/posts", { credentials: "same-origin" });

    if (response.status === 403) {
      schoolBoard.hidden = true;
      paymentForm.hidden = false;
      return;
    }
    if (!response.ok) throw new Error("Could not load school posts.");

    posts = await response.json();
    schoolBoard.hidden = false;
    paymentForm.hidden = true;
    renderPosts();
  } catch (error) {
    showMessage(error.message);
  }
}

paymentForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = paymentForm.querySelector("button");
  button.disabled = true;
  showMessage("");

  try {
    const email = new FormData(paymentForm).get("email");
    const response = await fetch("/api/payment/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not start payment.");

    window.location.assign(result.url);
  } catch (error) {
    showMessage(error.message);
    button.disabled = false;
  }
});

postForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = postForm.querySelector("button");
  button.disabled = true;
  showMessage("");

  try {
    const data = Object.fromEntries(new FormData(postForm));
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not post your school.");

    postForm.reset();
    showMessage("Your school has been posted.");
    if (!schoolBoard.hidden) await loadPosts();
  } catch (error) {
    showMessage(error.message);
  } finally {
    button.disabled = false;
  }
});

searchInput.addEventListener("input", renderPosts);

if (new URLSearchParams(location.search).get("payment") === "failed") {
  showMessage("Payment was not confirmed. Please try again.");
}
loadPosts();
