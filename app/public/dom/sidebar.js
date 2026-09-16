import { populateChatHeaderText, showChat, hideChat, clearMessages } from "./chat.js";
import { pfpLink } from "../app.js";
import { getElement } from "./dom.js";
import { signout, createGroup, getGroup, getChannel, setChannel, setGroup, session } from "../session.js";
import { sendHandlers } from "../socket.js";

const groupList = document.getElementById("group-list");
const newGroupButton = document.getElementById("new-group");
const userPfp = document.getElementById("profile-image");
const signoutButton = document.getElementById("sign-out");

export function initSidebar () {
    userPfp.addEventListener("click", () => {
        let form = getElement.fileForm();
        createPopup(form, () => {
            uploadFile(form.querySelector("input[type=file]").files[0], (id) => {
                sendHandlers.setPfp(id);
            });
        });
    });
    userPfp.alt = session.userId;
    userPfp.src = pfpLink(session.userId);
    newGroupButton.addEventListener("click", () => createGroup("Untitled group"));
    signoutButton.addEventListener("click", () => {signout()});
}

export function populateGroupList (groups) {
    hideChat();
    groupList.replaceChildren();

    for(let group of groups) {
        let container = document.createElement("div");
        container.className = ("list-button-container");
        container.dataset.groupId = group.id;

        let groupButtonElm = document.createElement("button");
        groupButtonElm.textContent = "@ " + group.name;
        groupButtonElm.className = 'group-button';
        groupButtonElm.title = "Open " + group.name;
        groupButtonElm.type = 'button';

        let renameButtonElm = getElement.renameButton(group, "group");
        let deleteButtonElm = getElement.deleteButton(group, "group");
        deleteButtonElm.addEventListener('click', () => {
            if(getGroup() === group.id) {
                setGroup(-1);
                setChannel(-1);
                deselectAnyChannel();
            }
        });

        function select() {
            const groupButtons = document.querySelectorAll('.group-button');
            groupButtons.forEach(b => b.classList.remove('is-selected'));
            groupButtonElm.classList.toggle('is-selected');
            sendHandlers.getGroupInfo(group.id);
            setGroup(group.id);
        }
        function deselect() {
            groupButtonElm.classList.remove('is-selected');
            deselectAnyChannel();
            clearChannelList();
        }

        let alreadyCurrent = getGroup() === group.id;
        if(alreadyCurrent) select();
        groupButtonElm.addEventListener("click", () => {
            if(groupButtonElm.classList.contains('is-selected')) {
                deselect();
                return;
            }
            select();
        });
        container.appendChild(groupButtonElm);
        container.appendChild(renameButtonElm);
        container.appendChild(deleteButtonElm);
        groupList.appendChild(container);
    }
}

export function populateChannelList (channels, groupId) {
    hideChat();
    clearChannelList();

    let channelList = document.createElement("div");
    channelList.className = "channel-list";

    let groupButtonContainerElm = document.querySelector(`[data-group-id="${groupId}"]`);
    
    for(let channel of channels) {
        let container = document.createElement("div");
        container.className = ("list-button-container");
        container.dataset.channelId = channel.id;
        container.dataset.name = channel.name;

        let channelButtonElm = document.createElement("button");
        channelButtonElm.textContent = '# '+ channel.name;
        channelButtonElm.className = 'channel-button';
        channelButtonElm.type = 'button';

        let renameButtonElm = getElement.renameButton(channel, "channel");
        let deleteButtonElm = getElement.deleteButton(channel, "channel");
        deleteButtonElm.addEventListener('click', () => {
            if(getChannel() === channel.id) {
                setChannel(-1);
                deselectAnyChannel();
            }
        });

        function select() {
            const channelButtons = document.querySelectorAll('.channel-button');
            channelButtons.forEach(b => b.classList.remove('is-selected'));
            channelButtonElm.classList.toggle('is-selected');

            setChannel(channel.id);
            session.groupName = groupButtonContainerElm.querySelector(".group-button").textContent.substring(2);
            session.channelName = channel.name;

            clearMessages();

            sendHandlers.getMessages(channel.id, null);
            populateChatHeaderText(session.groupName, session.channelName);

            showChat();
        }

        function deselect() {
            channelButtonElm.classList.remove('is-selected');
            hideChat();
        }

        let alreadyCurrent = getChannel() === channel.id;
        if(alreadyCurrent) select();
        channelButtonElm.addEventListener("click", () => {
            if(channelButtonElm.classList.contains('is-selected')) {
                deselect();
                return;
            }
            select();
        });
        container.append(channelButtonElm);
        container.appendChild(renameButtonElm);
        container.appendChild(deleteButtonElm);
        channelList.append(container);
    }

    let newChannelButtonElm = document.createElement("button");
    newChannelButtonElm.textContent = '+ New channel';
    newChannelButtonElm.className = 'channel-button';
    newChannelButtonElm.type = 'button';
    newChannelButtonElm.addEventListener("click", () => {
        sendHandlers.createThing('channel', 'Untitled channel', groupId);
    });
    channelList.append(newChannelButtonElm);
    
    groupButtonContainerElm.after(channelList);
}

function deselectAnyChannel() {
    setChannel(-1);
    hideChat();
}

export function clearChannelList () {
    clearMessages();
    let existingChannelList = document.querySelector(".channel-list");
    if (existingChannelList) {
        existingChannelList.remove();
    }
}