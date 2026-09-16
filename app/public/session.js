
import { sendHandlers } from "./socket.js";
import { getChatInputFieldText, prependMessage, fixMessages, getMessageDiv, clearReplyContainer } from "./dom/chat.js";

export const session = {
    url: new URL(window.location.href),
    userId: -1,
    userName: "",
    groupName: "",
    channelName: "",
    oldestMessageIndex: -1,
    messageFileId: null,
    messageReplyId: null,
    announcedTypingStatus: false
};
export const messageQueue = [];
export const userCache = {};
export const groupList = [];
export const channelList = [];

export function inChannel() {
    return getChannel() >= 0;
}

export function setGroup(id) {
    session.url.searchParams.set('group', id);
    window.history.pushState({}, '', session.url);
}

export function setChannel(id) {
    if (session.announcedTypingStatus) {
        sendHandlers.typingStatus(getChannel(), false);
        session.announcedTypingStatus = false;
    }
    session.url.searchParams.set('channel', id);
    window.history.pushState({}, '', session.url);
    if (getChatInputFieldText(false).length !== 0) {
        sendHandlers.typingStatus(getChannel(), true);
        session.announcedTypingStatus = true;
    }
}

export function getGroup() {
    let ret = Number(session.url.searchParams.get('group'));
    console.log("getGroup() is returning ", ret);
    return ret ? ret : -1;
}

export function getChannel() {
    let ret = Number(session.url.searchParams.get('channel'));
    console.log("getChannel() is returning ", ret);
    return ret ? ret : -1;
}

export function resetOldestMessageIndex(){
    session.oldestMessageIndex = -1;
}

export function addMessageToQueue(message){
    messageQueue.push({
        message: message,
        requestSent: false,
        dataReady: function () {
            return userCache[this.message.userId] !== undefined;
        },
        requestData: function () {
            this.requestSent = true;
            sendHandlers.getUserInfo(this.message.userId);
        },
        execute: function () {
            this.requestSent = false;
            let oldestMessageAlreadyLoaded = session.oldestMessageIndex == -1 || session.oldestMessageIndex > this.message.index;
            if( oldestMessageAlreadyLoaded ) { session.oldestMessageIndex = this.message.index; }
            let userMatch = userCache[this.message.userId];
            let username = userMatch ? userMatch.name : "Unknown";
            let messageDiv = getMessageDiv(this.message.id, this.message.contents, username, this.message.userId, this.message.timestamp, this.message.index, this.message.fileId, this.message.reply);
            prependMessage(messageDiv);
            
        }
    });
}

export function uploadFile(file, handler) {
    let reader = new FileReader();
    reader.onload = (e) => {
        fetch(`/file?name=${file.name}`, {
            method: "PUT",
            body: e.target.result,
            headers: {"Content-Type": "application/octet-stream"}
        }).then(res => {
            if (!res.ok) {
                throw(response.text());
            }
            return res.text();
        }).then(res => {
            let i = parseInt(res);
            if (isNaN(i)) {
                throw(res, "is NaN!");
            } else {
                handler(i);
            }
        }).catch(async err => {
            console.log("ERROR OCCURRED: ", await err);
            handler(null);
        });
    };
    reader.readAsArrayBuffer(file);
}

export function processMessageQueue() {
    console.log("Processing message queue");
    while (messageQueue.length > 0) {
        let event = messageQueue[0];
        if (!event.dataReady()) {
            if (!event.requestSent) event.requestData();
            return;
        }
        event.execute();
        messageQueue.shift();
    }
    fixMessages();
}

export function createGroup(name) {
    console.log("Create group function called with name: ", name);
    sendHandlers.createThing("group", name);
}

export function signout() {
    document.cookie = "token=deleted";
    window.location.href = "/";

}

export function loadSomeOlderMessages() {
    if (session.oldestMessageIndex <= 1) return;
    console.log("Scrolled to top! Loading more messages!");
    sendHandlers.getMessages(getChannel(), session.oldestMessageIndex - 1);
}

export function sendMessage() {
    if (!inChannel()) {
        console.log("Cannot send message. Not currently in a channel.");
        return;
    }
    let messageText = getChatInputFieldText(true);
    if(messageText === "" && session.messageFileId === null) {
        console.log("Cannot send message. Nothing in text field and no file attached.");
        return;
    }
    console.log("Sending message in channel ", getChannel(), ": ", messageText);
    sendHandlers.sendMessage(getChannel(), messageText, session.messageFileId, session.messageReplyId);
    session.messageReplyId = null;
    session.messageFileId = null;
    clearReplyContainer();
}

export function pfpLink(userId) {
    if (userId in userCache) {
        return `/file?id=${userCache[userId].pfpId}`;
    } else {
        return "";
    }
}