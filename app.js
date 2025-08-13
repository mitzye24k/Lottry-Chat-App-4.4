const accounts = {
  admin: "168",
  user1: "1111",
  user2: "2222",
  saka: "1111",
};
let currentUser = null;
let unreadCount = 0;
let lastMessageId = 0;

if (!localStorage.getItem("messages")) {
  localStorage.setItem("messages", JSON.stringify([]));
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(
    2,
    "0"
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Notification Bell Elements
const notificationBell = document.getElementById("notificationBell");
const notificationCountElem = document.getElementById("notificationCount");

// LOGIN
document.getElementById("loginBtn").onclick = () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  if (accounts[u] && accounts[u] === p) {
    currentUser = u;
    document.getElementById("loginBox").classList.add("hidden");
    if (u === "admin") {
      document.getElementById("adminPanel").classList.remove("hidden");
      loadAllMessages();
      resetNotification();
      startPolling();
    } else {
      document.getElementById("userPanel").classList.remove("hidden");
      document.getElementById("userNameDisplay").textContent = u;
      loadUserMessages();
      resetNotification();
      startPolling();
    }
  } else {
    alert("ឈ្មោះ ឬ ពាក្យសម្ងាត់ មិនត្រឹមត្រូវ!");
  }
};

// LOGOUT
document.getElementById("logoutUserBtn").onclick = () => location.reload();
document.getElementById("logoutAdminBtn").onclick = () => location.reload();

// SEND MESSAGE (User)
document.getElementById("sendBtn").onclick = () => {
  const text = document.getElementById("msgText").value.trim();
  const file = document.getElementById("msgImage").files[0];
  if (!text && !file) return alert("សូមបញ្ចូលសារ ឬ រូបភាព!");

  const reader = new FileReader();
  reader.onload = (e) => {
    const imgData = file ? e.target.result : null;
    const msgs = JSON.parse(localStorage.getItem("messages"));
    msgs.push({
      id: Date.now(),
      user: currentUser,
      text,
      image: imgData,
      replyTo: null,
      timestamp: Date.now(),
    });
    localStorage.setItem("messages", JSON.stringify(msgs));
    document.getElementById("msgText").value = "";
    document.getElementById("msgImage").value = "";
    loadUserMessages();
  };
  if (file) reader.readAsDataURL(file);
  else reader.onload({ target: { result: null } });
};

// LOAD USER MESSAGES
function loadUserMessages(scroll = true) {
  const msgs = JSON.parse(localStorage.getItem("messages"));
  const myMsgs = msgs.filter(
    (m) => m.user === currentUser && m.replyTo === null
  );
  const container = document.getElementById("myMessages");

  container.innerHTML = myMsgs
    .map((m) => {
      const replies = msgs.filter(
        (r) => r.replyTo === m.id && r.user === "admin"
      );
      return `
          <div class="message">
            <span class="message-user">អ្នក</span>:
            <div>${escapeHtml(m.text)}</div>
            ${
              m.image
                ? `<img src="${m.image}" class="img-thumbnail clickable-image">`
                : ""
            }
            <div class="timestamp">${formatTimestamp(m.timestamp)}</div>
            <div class="message-actions">
              <button class="btn btn-sm btn-outline-primary" onclick="editMessage(${
                m.id
              })">កែ</button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteMessage(${
                m.id
              })">លុប</button>
            </div>
            ${renderUserReplies(replies)}
          </div>
        `;
    })
    .join("");
  addImageClickEvents();

  if (scroll) {
    const containerBox = document.getElementById("userMessagesContainer");
    containerBox.scrollTop = containerBox.scrollHeight;
  }

  if (myMsgs.length) {
    lastMessageId = Math.max(lastMessageId, ...myMsgs.map((m) => m.id));
  }
}

function renderUserReplies(replies) {
  if (!replies.length) return "";
  return `<div class="reply-section">
        ${replies
          .map(
            (r) => `
          <div class="reply-message">
            <span class="message-admin">Admin</span>: ${escapeHtml(r.text)}
            ${
              r.image
                ? `<img src="${r.image}" class="img-thumbnail clickable-image">`
                : ""
            }
            <div class="timestamp">${formatTimestamp(r.timestamp)}</div>
          </div>
        `
          )
          .join("")}
      </div>`;
}

// LOAD ALL MESSAGES (Admin view)
function loadAllMessages(scroll = true) {
  const msgs = JSON.parse(localStorage.getItem("messages"));
  const container = document.getElementById("allMessages");

  container.innerHTML = msgs
    .filter((m) => m.replyTo === null)
    .map((m) => {
      const replies = msgs.filter((r) => r.replyTo === m.id);
      return `
          <div class="message">
            <span class="${
              m.user === "admin" ? "message-admin" : "message-user"
            }">${escapeHtml(m.user)}</span>:
            <div>${escapeHtml(m.text)}</div>
            ${
              m.image
                ? `<img src="${m.image}" class="img-thumbnail clickable-image">`
                : ""
            }
            <div class="timestamp">${formatTimestamp(m.timestamp)}</div>
            <div>
              <button class="btn btn-sm btn-success" onclick="showReplyBox(${
                m.id
              })">ឆ្លើយ</button>
              <button class="btn btn-sm btn-danger" onclick="deleteMessage(${
                m.id
              })">លុប</button>
            </div>
            <div id="replyBox-${m.id}" class="hidden mt-2">
              <textarea id="replyText-${
                m.id
              }" class="form-control mb-2"></textarea>
              <button class="btn btn-sm btn-success" onclick="sendReply(${
                m.id
              })">ផ្ញើ</button>
              <button class="btn btn-sm btn-secondary" onclick="hideReplyBox(${
                m.id
              })">បោះបង់</button>
            </div>
            ${renderReplies(replies)}
          </div>
        `;
    })
    .join("");
  addImageClickEvents();

  if (scroll) {
    const containerBox = document.getElementById("adminMessagesContainer");
    containerBox.scrollTop = containerBox.scrollHeight;
  }

  if (msgs.length) {
    lastMessageId = Math.max(lastMessageId, ...msgs.map((m) => m.id));
  }
}

function renderReplies(replies) {
  if (!replies.length) return "";
  return replies
    .map(
      (r) => `
        <div class="reply-message">
          <span class="${
            r.user === "admin" ? "message-admin" : "message-user"
          }">${escapeHtml(r.user)}</span>:
          ${escapeHtml(r.text)}
          ${
            r.image
              ? `<img src="${r.image}" class="img-thumbnail clickable-image">`
              : ""
          }
          <div class="timestamp">${formatTimestamp(r.timestamp)}</div>
        </div>
      `
    )
    .join("");
}

// Show/hide reply box (Admin)
function showReplyBox(id) {
  document.getElementById(`replyBox-${id}`).classList.remove("hidden");
}
function hideReplyBox(id) {
  document.getElementById(`replyBox-${id}`).classList.add("hidden");
}

// Send reply (Admin)
function sendReply(parentId) {
  const txt = document.getElementById(`replyText-${parentId}`).value.trim();
  if (!txt) return alert("សូមបញ្ចូលសារឆ្លើយ!");
  const msgs = JSON.parse(localStorage.getItem("messages"));
  msgs.push({
    id: Date.now(),
    user: "admin",
    text: txt,
    image: null,
    replyTo: parentId,
    timestamp: Date.now(),
  });
  localStorage.setItem("messages", JSON.stringify(msgs));
  hideReplyBox(parentId);
  loadAllMessages();

  if (currentUser !== "admin" && currentUser !== null) {
    incrementNotification();
  }
}

// Delete message and its replies
function deleteMessage(id) {
  if (!confirm("តើអ្នកប្រាកដចង់លុប?")) return;
  let msgs = JSON.parse(localStorage.getItem("messages"));
  msgs = msgs.filter((m) => m.id !== id && m.replyTo !== id);
  localStorage.setItem("messages", JSON.stringify(msgs));
  if (currentUser === "admin") loadAllMessages();
  else loadUserMessages();
}

// Edit message (only user can edit their own)
function editMessage(id) {
  const msgs = JSON.parse(localStorage.getItem("messages"));
  const msg = msgs.find((m) => m.id === id);
  if (!msg || msg.user !== currentUser) return alert("មិនអាចកែសម្រួល!");
  const newText = prompt("កែសម្រួលសារ:", msg.text);
  if (newText !== null) {
    msg.text = newText.trim();
    localStorage.setItem("messages", JSON.stringify(msgs));
    loadUserMessages();
  }
}

// Lightbox for images
function addImageClickEvents() {
  const imgs = document.querySelectorAll("img.clickable-image");
  const lightbox = document.getElementById("lightboxOverlay");
  const lightboxImg = lightbox.querySelector("img");
  imgs.forEach(
    (img) =>
      (img.onclick = () => {
        lightboxImg.src = img.src;
        lightbox.style.display = "flex";
      })
  );
  lightbox.onclick = () => {
    lightbox.style.display = "none";
    lightboxImg.src = "";
  };
}

// Notification functions
function incrementNotification() {
  unreadCount++;
  updateNotificationUI();
  updateBrowserTitle();
}

function resetNotification() {
  unreadCount = 0;
  updateNotificationUI();
  document.title = "ប្រព័ន្ធផ្ញើសារ";
}

function updateNotificationUI() {
  if (unreadCount > 0) {
    notificationBell.classList.remove("hidden");
    notificationCountElem.textContent = unreadCount;
  } else {
    notificationBell.classList.add("hidden");
  }
}

function updateBrowserTitle() {
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) សារថ្មី`;
  } else {
    document.title = "ប្រព័ន្ធផ្ញើសារ";
  }
}
// When clicking notification bell, scroll to bottom of messages and reset count
notificationBell.onclick = () => {
  if (currentUser !== null) {
    if (currentUser === "admin") {
      const containerBox = document.getElementById("adminMessagesContainer");
      containerBox.scrollTop = containerBox.scrollHeight;
    } else {
      const containerBox = document.getElementById("userMessagesContainer");
      containerBox.scrollTop = containerBox.scrollHeight;
    }
    resetNotification();
  }
};

// Polling to check new messages every 3 seconds
function startPolling() {
  setInterval(() => {
    const msgs = JSON.parse(localStorage.getItem("messages"));
    if (!msgs.length) return;

    let newMessages = [];

    if (currentUser === "admin") {
      // Admin sees all new messages after lastMessageId
      newMessages = msgs.filter((m) => m.id > lastMessageId);
    } else {
      // User sees new admin replies or messages from others
      newMessages = msgs.filter(
        (m) => m.id > lastMessageId && m.user !== currentUser
      );
    }

    if (newMessages.length > 0) {
      lastMessageId = Math.max(...newMessages.map((m) => m.id));

      if (currentUser === "admin") {
        loadAllMessages(false);
      } else {
        loadUserMessages(false);
      }

      incrementNotification();
    }
  }, 3000);
}
