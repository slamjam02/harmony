import { session, userCache, addMessageToQueue, processMessageQueue, getGroup, getChannel } from "./session.js";
import { initDOM, updateUserPfp } from "./dom/dom.js";
import { deleteMessage, displayTypingIndicator } from "./dom/chat.js";
import { populateChannelList, populateGroupList } from "./dom/sidebar.js";

const socket = new WebSocket("ws://" + window.location.hostname + ":" + window.location.port);

const receiveHandlers = {
    invalidToken:       function () {
        window.location.href = "/";
    },
    validToken:         function (userId) {
        console.log("Valid token message from server");
        session.userId = userId;
        initDOM();
    },
    groupList:          function (groups) {
        console.log("Group list message from server");
        populateGroupList(groups);
    },
    groupInfo:          function (groupId, channels) {
        console.log("Group info message from server. Server Group ID = ", groupId, " Session Group ID = ", getGroup());
        console.log(channels);
        if(getGroup() === groupId) {
            console.log("Channel list appending.");
            populateChannelList(channels, groupId);
        }
    },
    messages:           function (channelId, messages) {
        console.log("Messages message from server");
        console.log("Channel ID messages received in: ", channelId);
        let reversedMessages = messages.toReversed();
        if(getChannel() === channelId) {
            for (let message of reversedMessages) {
                addMessageToQueue(message);
            }
        }
    },
    typingIndicator:    function (channelId, usersTyping) {
        console.log("Typing indicator message from server");
        if (usersTyping.includes(session.userId)) {
            usersTyping.splice(usersTyping.indexOf(session.userId), 1);
        }
        if (getChannel() === channelId) {
            const timeoutId = setTimeout(() => {displayTypingIndicator(usersTyping);}, 200);
        }
    },
    userInfo:           function (id, name, pfpId) {
        console.log("User info message from server");
        userCache[id] = {id: id, name: name, pfpId: pfpId};
        updateUserPfp(id);
    },
    deleteMessage:      function (id) {
        console.log("message deleted!", id);
        deleteMessage(id);
    }
};

export const sendHandlers = {
    token:          function (tok) {
        let data = {type: 'token', token: tok};
        socket.send(JSON.stringify(data));
    },
    getGroupInfo:   function (id) {
        let data = {type: 'getGroupInfo', id: id};
        socket.send(JSON.stringify(data));
        console.log("Current group set to ", getGroup());
        console.log("Channel ID set", getChannel());
    },
    getMessages:    function (channelId, index) {
        let data = {type: 'getMessages', channelId: channelId, index: index};
        socket.send(JSON.stringify(data));
    },
    typingStatus:   function (channelId, isTyping) {
        let data = {type: 'typingStatus', channelId: channelId, isTyping: isTyping};
        socket.send(JSON.stringify(data));
    },
    sendMessage:    function (channelId, contents, fileId, replyId) {
        let data = {type: 'sendMessage', channelId: channelId, contents: contents, fileId: fileId, reply: replyId};
        socket.send(JSON.stringify(data));
    },
    getUserInfo:    function (id) {
        let data = {type: 'getUserInfo', id: id};
        socket.send(JSON.stringify(data));
    },
    setPfp:         function (fileId) {
        let data = {type: 'setPfp', fileId: fileId};
        socket.send(JSON.stringify(data));
    },
    createThing:    function (thingType, name, id = null) {
        let data = {type: 'createThing', thingType: thingType, name: name, groupId: id};
        socket.send(JSON.stringify(data));
    },
    renameThing:    function (thingType, id, name) {
        let data = {type: 'renameThing', thingType: thingType, id: id, name: name};
        socket.send(JSON.stringify(data));
    },
    deleteThing:    function (thingType, id) {
        let data = {type: 'deleteThing', thingType: thingType, id: id};
        if(thingType === "group" && getGroup() === id) {
            setGroupId(-1);
            setChannelId(-1);
        }
        if(thingType === "channel" && getChannel() === id) {
            setChannelId(-1);
        }
        socket.send(JSON.stringify(data));
    },
    inviteUser:     function (groupId, username) {
        let data = {type: 'inviteUser', groupId: groupId, username: username};
        socket.send(JSON.stringify(data));
    },
};

socket.addEventListener('open', () => {
    console.log('WebSocket connected');
    let token = document.cookie.split("; ")?.find((row) => row.startsWith("token="))?.split("=")[1];
    sendHandlers.token(token);
});

socket.addEventListener("message", (event) => {
    let data = JSON.parse(event.data);
    console.log("message from server:", data)
    switch (data.type) {
        case "invalidToken":
            receiveHandlers.invalidToken();
            break;
        case "validToken":
            receiveHandlers.validToken(data.userId);
            break;
        case "groupList":
            receiveHandlers.groupList(data.groups);
            break;
        case "groupInfo":
            receiveHandlers.groupInfo(data.id, data.channels);
            break;
        case "messages":
            receiveHandlers.messages(data.channelId, data.messages);
            processMessageQueue();
            break;
        case "typingIndicator":
            receiveHandlers.typingIndicator(data.channelId, data.usersTyping);
            break;
        case "userInfo":
            receiveHandlers.userInfo(data.id, data.username, data.pfpId);
            processMessageQueue();
            break;
        case "deleteMessage":
            receiveHandlers.deleteMessage(data.id);
        default:
            break;
    }
    
});