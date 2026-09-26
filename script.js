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
const whatsappInput = document.querySelector("#whatsapp");

let posts = [];

function showMessage(text) {
  message.textContent = text;
}

function validWhatsAppNumber(number) {
  return /^\+254[17][0-9]{8}$/.test(number);
}

function subjectList(value) {
  return String(value || "")
    .split(",")
    .map(subject => subject.trim())
    .filter(Boolean);
}

// Remove spaces if someone types or pastes them into the WhatsApp field.
whatsappInput.addEventListener("input", () => {
  whatsappInput.value = whatsappInput.value.replace(/\s/g, "");
});

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
      post.subjects,
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
    level.textContent = post.level || "";

    const school = document.createElement("h3");
    school.textContent = post.school || "";

    const location = document.createElement("p");
    location.textContent = `${post.subcounty || ""}, ${post.county || ""}`;

    const subjects = document.createElement("p");
    subjects.className = "subjects";
    subjects.textContent = post.subjects
      ? `Subjects: ${post.subjects}`
      : "Subjects: Not provided";

    const destination = document.createElement("p");
    destination.textContent =
      `Looking for: ${post.desired_school || ""}, ${post.desired_county || ""}`;

    card.append(level, school, location, subjects, destination);

    if (validWhatsAppNumber(post.whatsapp_number || "")) {
      const firstSubject = subjectList(post.subjects)[0];
      const greeting = firstSubject
        ? `Hi fellow ${firstSubject} teacher. I saw your post on Teachers transfer APP`
        : "Hi fellow teacher. I saw your post on Teachers transfer APP";

      const chatLink = document.createElement("a");
      chatLink.className = "whatsapp-link";
      chatLink.href =
        `https://wa.me/${post.whatsapp_number.slice(1)}?text=${encodeURIComponent(greeting)}`;
      chatLink.target = "_blank";
      chatLink.rel = "noopener noreferrer";
      chatLink.textContent = "Click here to chat with the person who posted";

      card.append(chatLink);
    }

    postsElement.append(card);
  }
}

async function loadPosts() {
  refresh.disabled = true;
  showMessage("Loading schools…");

  try {
    const response = await fetch(
      `${POSTS_URL}?select=school,county,subcounty,level,subjects,desired_county,desired_school,whatsapp_number,created_at&order=created_at.desc&limit=200`,
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
  showMessage("");

  const data = Object.fromEntries(new FormData(form));
  const number = data.whatsapp;
  const subjects = subjectList(data.subjects);

  if (subjects.length === 0) {
    showMessage("Enter at least one subject you teach.");
    document.querySelector("#subjects").focus();
    return;
  }

  if (!validWhatsAppNumber(number)) {
    showMessage(
      "Enter a WhatsApp number starting with +254, followed by 9 digits, without spaces. Example: +254712345678."
    );
    whatsappInput.focus();
    return;
  }

  postButton.disabled = true;

  try {
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
        subjects: subjects.join(", "),
        desired_county: data.desiredCounty.trim(),
        desired_school: data.desiredSchool.trim(),
        whatsapp_number: number
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
