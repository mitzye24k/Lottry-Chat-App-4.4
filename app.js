const accounts = { admin: "1234", user1: "1111", user2: "2222" };
let currentUser = null;
let currentDeviceId = null;
let unreadCount = 0;
let lastMessageId = 0;

// Initialize storage
if (!localStorage.getItem("messages")) {
  localStorage.setItem("messages", JSON.stringify([]));
}
if (!localStorage.getItem("devices")) {
  localStorage.setItem("devices", JSON.stringify({}));
}

// Helper functions
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

function generateDeviceId() {
  return (
    "device_" +
    Math.random().toString(36).substr(2, 9) +
    "_" +
    Date.now().toString(36)
  );
}

function registerDevice(user, deviceId) {
  const devices = JSON.parse(localStorage.getItem("devices"));
  if (!devices[deviceId]) {
    devices[deviceId] = {
      user,
      firstSeen: Date.now(),
      lastActive: Date.now(),
      ip: "N/A",
    };
    localStorage.setItem("devices", JSON.stringify(devices));
  }
  return deviceId;
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
  document.title = "ប្រព័ន្ធផ្ញើសារឆ្លងឧបករណ៍";
}

function updateNotificationUI() {
  const notificationBell = document.getElementById("notificationBell");
  const notificationCountElem = document.getElementById("notificationCount");

  if (unreadCount > 0) {
    notificationBell.classList.remove("hidden");
    notificationCountElem.textContent = unreadCount;
  } else {
    notificationBell.classList.add("hidden");
  }
}

function updateBrowserTitle() {
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) សារថ្មី | ប្រព័ន្ធផ្ញើសារឆ្លងឧបករណ៍`;
  } else {
    document.title = "ប្រព័ន្ធផ្ញើសារឆ្លងឧបករណ៍";
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

// LOGIN
document.getElementById("loginBtn").onclick = () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();

  if (accounts[u] && accounts[u] === p) {
    currentUser = u;

    // Generate or get existing device ID
    if (u === "admin") {
      const deviceCount = Object.keys(
        JSON.parse(localStorage.getItem("devices"))
      ).filter((id) => id.startsWith(`device_admin`)).length;

      currentDeviceId = `device_admin_${deviceCount + 1}_${Date.now()}`;
      localStorage.setItem(`device_${currentUser}`, currentDeviceId);
    } else {
      currentDeviceId = generateDeviceId();
      localStorage.setItem(`device_${currentUser}`, currentDeviceId);
    }

    registerDevice(currentUser, currentDeviceId);

    document.getElementById("loginBox").classList.add("hidden");
    if (u === "admin") {
      document.getElementById("adminPanel").classList.remove("hidden");
      document.getElementById(
        "adminDeviceDisplay"
      ).textContent = `Device: ${currentDeviceId.substr(0, 10)}...`;
      loadAllMessages();
      loadDevicesList();
      resetNotification();
      startPolling();
    } else {
      document.getElementById("userPanel").classList.remove("hidden");
      document.getElementById("userNameDisplay").textContent = u;
      document.getElementById("deviceIdDisplay").textContent =
        currentDeviceId.substr(0, 10) + "...";
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
    const deviceId = localStorage.getItem(`device_${currentUser}`);
    const msgs = JSON.parse(localStorage.getItem("messages"));

    // ស្វែងរក Admin Devices ទាំងអស់
    const adminDevices = Object.entries(
      JSON.parse(localStorage.getItem("devices"))
    )
      .filter(([id, info]) => info.user === "admin")
      .map(([id]) => id);

    // ផ្ញើសារទៅកាន់ Admin Devices ទាំងអស់
    adminDevices.forEach((adminDevice) => {
      const newMsgId = Date.now() + Math.floor(Math.random() * 1000); // ធានាថាមាន ID មិនដូចគ្នា

      msgs.push({
        id: newMsgId,
        user: currentUser,
        device: deviceId,
        targetDevice: adminDevice,
        text,
        image: imgData,
        replyTo: null,
        timestamp: Date.now(),
        isBroadcast: adminDevices.length > 1,
      });
    });

    localStorage.setItem("messages", JSON.stringify(msgs));
    document.getElementById("msgText").value = "";
    document.getElementById("msgImage").value = "";
    loadUserMessages();

    // Update device last active
    const devices = JSON.parse(localStorage.getItem("devices"));
    if (devices[deviceId]) {
      devices[deviceId].lastActive = Date.now();
      localStorage.setItem("devices", JSON.stringify(devices));
    }
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
          <div class="d-flex justify-content-between align-items-center">
            <span class="message-user">អ្នក</span>
            <small class="text-muted">${
              m.isBroadcast
                ? '<span class="broadcast-indicator">(ផ្ញើទៅ Admin ទាំងអស់)</span>'
                : ""
            }</small>
          </div>
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

  // Filter messages for this admin device
  const filteredMsgs = msgs.filter(
    (m) =>
      m.replyTo === null &&
      (!m.targetDevice || m.targetDevice === currentDeviceId)
  );

  container.innerHTML = filteredMsgs
    .map((m) => {
      const replies = msgs.filter((r) => r.replyTo === m.id);
      return `
        <div class="message">
          <div class="d-flex justify-content-between">
            <div>
              <span class="${
                m.user === "admin" ? "message-admin" : "message-user"
              }">
                ${escapeHtml(m.user)}
              </span>
              ${
                m.isBroadcast
                  ? '<span class="broadcast-indicator">(Broadcast)</span>'
                  : ""
              }
            </div>
            <div class="device-info">
              <small>From: ${
                m.device ? m.device.substr(0, 10) + "..." : "Unknown"
              }</small>
              ${
                m.targetDevice
                  ? `<span class="device-target">To: ${
                      m.targetDevice === currentDeviceId
                        ? "This device"
                        : m.targetDevice.substr(0, 10) + "..."
                    }</span>`
                  : ""
              }
            </div>
          </div>
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

  if (filteredMsgs.length) {
    lastMessageId = Math.max(lastMessageId, ...filteredMsgs.map((m) => m.id));
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

// LOAD DEVICES LIST (Admin view)
function loadDevicesList() {
  const devices = JSON.parse(localStorage.getItem("devices"));
  const tbody = document.getElementById("devicesList");

  tbody.innerHTML = Object.entries(devices)
    .map(
      ([id, info]) => `
      <tr>
        <td title="${id}">${id.substr(0, 10)}...</td>
        <td>${info.user} ${
        info.user === "admin"
          ? '<span class="admin-device-tag">Admin</span>'
          : ""
      }</td>
        <td>${formatTimestamp(info.firstSeen)}</td>
        <td>${formatTimestamp(info.lastActive)}</td>
        <td>
          ${
            info.user !== "admin"
              ? `<button class="btn btn-sm btn-outline-info" onclick="sendTestMessage('${id}')">សារល្បង</button>`
              : ""
          }
        </td>
      </tr>
    `
    )
    .join("");
}

// Send test message to device (Admin)
function sendTestMessage(deviceId) {
  const msgs = JSON.parse(localStorage.getItem("messages"));
  const newMsgId = Date.now();

  msgs.push({
    id: newMsgId,
    user: "admin",
    device: currentDeviceId,
    targetDevice: deviceId,
    text: "សារល្បងពី Admin",
    image: null,
    replyTo: null,
    timestamp: Date.now(),
  });

  localStorage.setItem("messages", JSON.stringify(msgs));
  loadAllMessages();
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
  const parentMsg = msgs.find((m) => m.id === parentId);

  msgs.push({
    id: Date.now(),
    user: "admin",
    device: currentDeviceId,
    targetDevice: parentMsg.device, // Reply to sender's device
    text: txt,
    image: null,
    replyTo: parentId,
    timestamp: Date.now(),
  });

  localStorage.setItem("messages", JSON.stringify(msgs));
  hideReplyBox(parentId);
  loadAllMessages();

  if (currentUser !== "admin") {
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

// When clicking notification bell
document.getElementById("notificationBell").onclick = () => {
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
      // Admin sees messages targeted to this device
      newMessages = msgs.filter(
        (m) =>
          m.id > lastMessageId &&
          (!m.targetDevice || m.targetDevice === currentDeviceId)
      );
      loadDevicesList();
    } else {
      // User sees replies from admin
      newMessages = msgs.filter(
        (m) => m.id > lastMessageId && m.user === "admin" && m.replyTo !== null
      );

      // Update device last active
      const deviceId = localStorage.getItem(`device_${currentUser}`);
      const devices = JSON.parse(localStorage.getItem("devices"));
      if (devices[deviceId]) {
        devices[deviceId].lastActive = Date.now();
        localStorage.setItem("devices", JSON.stringify(devices));
      }
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
