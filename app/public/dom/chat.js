import { getElement, createPopup } from "./dom.js";
import { resetOldestMessageIndex, loadSomeOlderMessages, session, sendMessage, getGroup, getChannel, pfpLink } from "../session.js";
import { sendHandlers } from "../socket.js";

const chatHeader = document.getElementById("chat-header");
const chatFooter = document.getElementById("chat-footer");
const chatHeaderTitle = document.getElementById("chat-header-text");
const inviteUserButton = document.getElementById("invite-user");
const chatInputContainer = document.getElementById("input");
const chatFileAttachButton = document.getElementById("attach");
const chatInputField = document.getElementById("type");
const chatSendButton = document.getElementById("send");
const chatMessagesContainer = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");

export function initChat () {
    inviteUserButton.addEventListener("click", () => {
        let form = getElement.textInputForm();
        createPopup(form, () => {
            let username = form.dataset.string;
            sendHandlers.inviteUser(getGroup(), username);
        });
    });
    chatMessagesContainer.addEventListener("scroll", () => {
        let container = chatMessagesContainer;
        const maxScrollUp = container.scrollHeight - container.clientHeight;
        if (Math.abs(container.scrollTop) >= maxScrollUp - 1) {
            loadSomeOlderMessages();
        }
    });
    chatInputContainer.classList.add("hidden");
    chatFileAttachButton.addEventListener("click", () => {
        let form = getElement.fileForm();
        createPopup(form, () => {
            uploadFile(form.querySelector("input[type=file]").files[0], (id) => {
                session.messageFileId = id;
            });
        });
    });
    chatSendButton.addEventListener("click", () => sendMessage());
    chatInputField.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            sendMessage();
        }
    });
    chatInputField.addEventListener("input", () => {
        if (getChatInputFieldText(false).length === 0) {
            if (session.announcedTypingStatus) {
                sendHandlers.typingStatus(getChannel(), false);
                session.announcedTypingStatus = false;
            }
        } else {
            if (!session.announcedTypingStatus) {
                sendHandlers.typingStatus(getChannel(), true);
                session.announcedTypingStatus = true;
            }
        }
    });
}

export function hideChat() {
    typingIndicator.classList.add("hidden");
    chatInputContainer.classList.add("hidden");
    chatMessagesContainer.classList.add("hidden");
    chatHeader.classList.add("hidden");
}

export function showChat() {
    chatInputContainer.classList.remove("hidden");
    chatMessagesContainer.classList.remove("hidden");
    chatHeader.classList.remove("hidden");
}

export function populateChatHeaderText(groupName, channelName) {
    chatHeaderTitle.textContent = `@ ${groupName} # ${channelName}`;
}


export function appendMessage(elm) {
    chatMessagesContainer.append(elm);
}

export function prependMessage(elm) {
    chatMessagesContainer.prepend(elm);
}

export function deleteMessage(id) {
    findMessageElmById(id).remove();
    fixMessages();
}

export function findMessageElmById(id) {
    for (const elm of chatMessagesContainer.children) {
        if (elm.dataset.id === id.toString()) {
            return elm;
        }
    }
}

function refreshDuplicates() {
    console.log("Refreshing message styles.");
    let chatMessages = chatMessagesContainer.children;
    for(let i = 0; i < chatMessages.length; i++) {
        let messageHeader = chatMessages[i].querySelector(".chat-message-div");
        let profilePicture = messageHeader.querySelector(".chat-message-profile-pic");
        let username = messageHeader.querySelector(".chat-message-username");
        let timestamp = messageHeader.querySelector(".chat-message-timestamp");

        profilePicture.classList.remove("hidden");
        username.classList.remove("hidden");
        timestamp.classList.remove("chat-message-timestamp-cascaded");
    }
}

function cascadeDuplicateUsersInChat() {
    console.log("Cascading message styles.");
    let chatMessages = chatMessagesContainer.children;
    for(let i = 0; i < chatMessages.length; i++) {
        let messageHeader = chatMessages[i].querySelector(".chat-message-div");
        let profilePicture = messageHeader.querySelector(".chat-message-profile-pic");
        let username = messageHeader.querySelector(".chat-message-username");
        let timestamp = messageHeader.querySelector(".chat-message-timestamp");
        let isReply = chatMessages[i].dataset.reply;
        
        let nextMessage = chatMessages[i + 1];
        if(nextMessage && chatMessages[i].dataset.userId === nextMessage.dataset.userId && !(isReply)) {
            profilePicture.classList.add("hidden");
            username.classList.add("hidden");
            timestamp.classList.add("chat-message-timestamp-cascaded");
        }
    }
}

function clearDuplicateMessages() {
    console.log("Deleting duplicate messages.");
    let chatMessages = chatMessagesContainer.children;
    for(let i = 0; i < chatMessages.length; i++) {
        let nextMessage = chatMessages[i + 1];
        if(nextMessage && chatMessages[i].dataset.id === nextMessage.dataset.id) {
            nextMessage.remove();
        }
    }
}

function sortMessages() {
    console.log("Sorting messages.");
    const nodes = [...chatMessagesContainer.children].sort((a, b) => {
    return String(b.dataset.timestamp).localeCompare(String(a.dataset.timestamp));
    });
    chatMessagesContainer.replaceChildren(...nodes);
}

export function fixMessages() {
    refreshDuplicates();
    sortMessages();
    clearDuplicateMessages();
    cascadeDuplicateUsersInChat();
}
export function getChatInputFieldText(clear) {
    let text = chatInputField.value;
    if (clear) {
        chatInputField.value = "";
        if (session.announcedTypingStatus) {
            sendHandlers.typingStatus(getChannel(), false);
            session.announcedTypingStatus = false;
        }
    }
    return text;
}

export function displayTypingIndicator(usersTyping) {
    const activeTypers = usersTyping.filter(id => id !== session.userId);
    if (activeTypers.length === 0) {
        typingIndicator.classList.add("hidden");
        return;
    }
    typingIndicator.classList.remove("hidden");
    const cachedNames = [];
    let uncachedCount = 0;
    for (const u of activeTypers) {
        if (u in userCache) {
            if (cachedNames.length < 3) {
                cachedNames.push(userCache[u].name);
            }
        } else {
            uncachedCount++;
            sendHandlers.getUserInfo(u);
        }
    }

    let str = "";
    if (cachedNames.length > 0) {
        str = cachedNames.join(", ");
        const remaining = activeTypers.length - cachedNames.length;
        if (remaining > 0) {
            str += ` and ${remaining} other${remaining > 1 ? "s" : ""}`;
        }
    } else {
        str = `${activeTypers.length} user${activeTypers.length > 1 ? "s" : ""}`;
    }

    str += ` ${activeTypers.length === 1 ? "is" : "are"} typing...`;
    typingIndicator.textContent = str;
}

export function clearMessages () {
    resetOldestMessageIndex();
    chatMessagesContainer.replaceChildren();
    typingIndicator.classList.add("hidden");
}

export function clearReplyContainer () {
    chatFooter.querySelector(".chat-reply-container").remove();
}

export function getMessageDiv (id, body, username, userId, timestamp, index, file = null, replyMessageId = null) {
    let container = document.createElement("div");
    container.className = "chat-message-container";
    container.dataset.id = id;
    container.dataset.userId = userId;
    container.dataset.timestamp = timestamp;
    container.dataset.index = index;

    // Context & right click menu stuff
    let buttons = [getElement.messageReplyButton(id)];
    if (userId === session.userId) buttons.push(getElement.messageDeleteButton(id));
    let contextMenu = getElement.contextMenu(buttons);
    
    container.addEventListener("contextmenu", (e) => {
        document.querySelectorAll(".context-menu").forEach(el => el.remove());
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.classList.remove("hidden");
        document.body.append(contextMenu);
        e.preventDefault();
    });

    if (replyMessageId) {
        container.dataset.reply = replyMessageId;
        container.append(getElement.replyContainer(replyMessageId));
    }

    let chatMessage = document.createElement("div");
    chatMessage.className = "chat-message-div";

    let pfpElm = document.createElement("img");
    pfpElm.className = "chat-message-profile-pic";
    pfpElm.src = pfpLink(userId);
    pfpElm.alt = userId;
    chatMessage.append(pfpElm);

    let usernameElm = document.createElement("p");
    usernameElm.className = "chat-message-username";
    usernameElm.textContent = username;
    chatMessage.append(usernameElm);

    let timestampElm = document.createElement("p");
    timestampElm.className = "chat-message-timestamp";
    let dateTime = new Date(timestamp);
    timestampElm.textContent = dateTime.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
    chatMessage.append(timestampElm);

    let bodyElm = document.createElement("p");
    bodyElm.className = "chat-message-body";
    bodyElm.textContent = body;
    chatMessage.append(bodyElm);

    container.append(chatMessage);
    
    if(file) {
        let fileElm = document.createElement("div");
        fileElm.className = "chat-file";
        container.append(fileElm);
        let fileName;
        fetch(`/file?id=${file}`).then(res => {
            if (!res.ok) {
                throw(res.text());
            }
            fileName = res.headers.get("Content-Disposition");
            fileName = fileName.substring(18, fileName.length - 1);
            return res.blob();
        }).then(res => {
                if (fileName.endsWith(".png")
                    || fileName.endsWith(".jpg")
                    || fileName.endsWith(".jpeg")
                    || fileName.endsWith(".gif")
                    || fileName.endsWith(".webp")
                    || fileName.endsWith(".heif")
                    || fileName.endsWith(".heic")) {
                    let image = document.createElement("img");
                    image.src = window.URL.createObjectURL(res);
                    image.className = "chat-image-embed";
                    fileElm.append(image);
                } else {
                    let download = document.createElement("a");
                    let size;
                    if (res.size < 1024) {
                        size = `${res.size} B`
                    } else if (res.size < 1024*1024) {
                        size = `${(res.size / 1024).toFixed(2)} KB`
                    } else {
                        size = `${(res.size / (1024*1024)).toFixed(2)} MB`
                    }
                    download.textContent = `download ${fileName} (${size})`
                    download.className = "chat-file-download";
                    download.href = window.URL.createObjectURL(res);
                    download.download = fileName;
                    fileElm.append(download);
                }
        }).catch(async err => {
            console.log("ERROR OCCURRED: ", await err);
            handler(null);
        });
    }
    return container;
}