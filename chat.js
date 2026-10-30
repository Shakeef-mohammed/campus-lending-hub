
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const messagesElement = document.getElementById("messages");
const noticeElement = document.getElementById("chatNotice");
const titleElement = document.getElementById("chatTitle");
const subtitleElement = document.getElementById("chatSubtitle");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const params = new URLSearchParams(window.location.search);
const requestId = params.get("requestId");

let currentUser = null;
let chatReady = false;
let sending = false;
let unsubscribeMessages = null;

function showNotice(message) {
  noticeElement.textContent = message;
}

function setComposerEnabled(enabled) {
  input.disabled = !enabled;
  sendButton.disabled = !enabled;
}

function showMessage(messageData) {
  const wrapper = document.createElement("div");
  const sender = document.createElement("span");
  const content = document.createElement("div");

  wrapper.className =
    "message " +
    (messageData.senderId === currentUser.uid ? "mine" : "theirs");

  sender.className = "sender";
  sender.textContent =
    messageData.senderId === currentUser.uid
      ? "You"
      : (messageData.senderName || "Student");

  content.textContent = messageData.text || "";

  wrapper.append(sender, content);
  messagesElement.appendChild(wrapper);
}

async function openChat() {
  if (!requestId) {
    showNotice("Chat link is missing its request ID.");
    return;
  }

  try {
    const requestRef = doc(db, "borrowRequests", requestId);
    const requestSnapshot = await getDoc(requestRef);

    if (!requestSnapshot.exists()) {
      showNotice("Borrow request not found.");
      return;
    }

    const requestData = requestSnapshot.data();

    const isParticipant =
      requestData.ownerId === currentUser.uid ||
      requestData.borrowerId === currentUser.uid;

    if (!isParticipant) {
      showNotice("You are not allowed to access this chat.");
      return;
    }

    titleElement.textContent =
      requestData.itemName || "Borrow Request Chat";

    subtitleElement.textContent =
      "Chat about this item. Please communicate respectfully.";

    const messagesRef = collection(
      db,
      "borrowRequests",
      requestId,
      "messages"
    );

    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

    chatReady = true;
    setComposerEnabled(true);
    showNotice("Connected. You can send messages.");

    unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        messagesElement.replaceChildren();

        if (snapshot.empty) {
          const emptyMessage = document.createElement("p");
          emptyMessage.textContent =
            "No messages yet. Start the conversation!";
          emptyMessage.style.color = "#64748b";
          messagesElement.appendChild(emptyMessage);
        }

        snapshot.forEach((messageDoc) => {
          showMessage(messageDoc.data());
        });

        messagesElement.scrollTop = messagesElement.scrollHeight;
      },
      (error) => {
        console.error("Message listener error:", error);
        showNotice("Could not load messages. Check Firestore Rules.");
      }
    );
  } catch (error) {
    console.error("Open chat error:", error);
    showNotice("Unable to open chat: " + error.message);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const messageText = input.value.trim();

  if (!chatReady || !currentUser || !messageText || sending) {
    return;
  }

  sending = true;
  setComposerEnabled(false);

  try {
    await addDoc(
      collection(db, "borrowRequests", requestId, "messages"),
      {
        senderId: currentUser.uid,
        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Student",
        text: messageText,
        createdAt: serverTimestamp()
      }
    );

    input.value = "";
    showNotice("Message sent.");
  } catch (error) {
    console.error("Send message error:", error);
    showNotice("Message failed: " + error.message);
  } finally {
    sending = false;
    setComposerEnabled(chatReady);
    if (chatReady) input.focus();
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  chatReady = false;
  setComposerEnabled(false);
  messagesElement.replaceChildren();

  if (!user) {
    showNotice("Please log in to use CampusShare Chat.");
    return;
  }

  await openChat();
});

window.addEventListener("pagehide", () => {
  if (unsubscribeMessages) unsubscribeMessages();
});
