import { session } from "../session.js";
import { sendHandlers } from "../socket.js";
import { pfpLink } from "../app.js";
import { initSidebar } from "./sidebar.js";
import { initChat } from "./chat.js";

export function initDOM () {
    console.log("Initializing DOM");
    initSidebar();
    initChat();
    document.addEventListener('click', function (event) {
        const contextMenus = document.getElementsByClassName('context-menu');
        for (let menu of contextMenus) {
            if (!menu.contains(event.target)) hideContextMenus();
        }
    });
    console.log("Current user id: ", session.userId);
}

export const getElement = {
    contextMenu: function (buttons) {
        let contextMenu = document.createElement("div");
        contextMenu.className = "context-menu";
        contextMenu.classList.add("hidden");
        for(let button of buttons) {
            contextMenu.append(button);
        }
        return contextMenu;
    },
    messageDeleteButton: function (id) {
        let button = document.createElement("button");
        button.textContent = "Delete";
        button.addEventListener("click", () => {
            hideContextMenus();
            console.log("Deleting message with id", id);
            sendHandlers.deleteThing("message", id);
        });
        return button;
    },
    messageReplyButton: function (id) {
        let button = document.createElement("button");
        button.textContent = "Reply";
        button.addEventListener("click", () => {
            hideContextMenus();
            let replyContainer = getElement.replyContainer(id);
            let clearButton = document.createElement("button");
            clearButton.textContent = "x";
            clearButton.className = "mini-x-button";
            clearButton.addEventListener("click", () => {replyContainer.remove(); session.messageReplyId = null;});
            replyContainer.prepend(clearButton);
            let replyText = replyContainer.querySelector(".reply-text");
            replyText.textContent = "↪ Replying to:";
            replyContainer.classList.add("chat-footer-reply-container");
            element.chatFooter.insertBefore(replyContainer, element.chatFooter.children[1]);
            session.messageReplyId = id;
        });
        return button;
    },
    fileForm: function () {
        let form = document.createElement("form");

        let input = document.createElement("input");
        input.type = "file";
        form.appendChild(input);

        let submit = document.createElement("input");
        submit.type = "submit";
        submit.value = "upload";

        form.appendChild(submit);
        return form;
    },
    yesOrNoForm: function (prompt) {
        let form = document.createElement("form");
        form.className = "popup-form";
        let promptElm = document.createElement("h2");
        promptElm.textContent = prompt;

        let yesButton = document.createElement("button");
        yesButton.type = "submit";
        yesButton.textContent = "Yes";


        let noButton = document.createElement("button");
        noButton.type = "reset";
        noButton.textContent = "No";

        form.appendChild(promptElm);
        form.appendChild(yesButton);
        form.appendChild(noButton);

        return form;
    },
    textInputForm: function (placeholder) {
        let form = document.createElement("form");
        form.className = "popup-form";

        let textInput = document.createElement("input");
        textInput.type = "text";
        textInput.placeholder = (placeholder) ? (placeholder) : ("Enter text");

        let yesButton = document.createElement("button");
        yesButton.type = "submit";
        yesButton.textContent = "Confirm";
        form.addEventListener("submit", () => {
            form.dataset.string = textInput.value;
        });

        let noButton = document.createElement("button");
        noButton.type = "reset";
        noButton.textContent = "Cancel";

        form.appendChild(textInput);
        form.appendChild(yesButton);
        form.appendChild(noButton);

        return form;
    },
    deleteButton: function (thing, thingType) {
        let deleteButtonElm = document.createElement("button");
        deleteButtonElm.title = "Delete " + thing.name;
        deleteButtonElm.textContent = "x";
        deleteButtonElm.type = 'button';
        deleteButtonElm.className = `mini-${thingType}-button`;

        deleteButtonElm.addEventListener('click', () => {
            let form = getElement.yesOrNoForm(`Delete ${thingType} ${thing.name}?`);
            console.log('Delete button clicked!');
            createPopup(form, () => {
                console.log(`Deleting ${thingType} ${thing.name} with ID: ${thing.id}`);
                sendHandlers.deleteThing(thingType, thing.id);
            });

        });
        return deleteButtonElm;
    },
    renameButton: function (thing, thingType) {
        let renameButtonElm = document.createElement("button");
        renameButtonElm.title = "Rename " + thing.name;
        renameButtonElm.textContent = "R";
        renameButtonElm.type = 'button';
        renameButtonElm.className = `mini-${thingType}-button`;

        renameButtonElm.addEventListener('click', () => {
            let form = getElement.textInputForm(`Rename ${thing.name}`);
                createPopup(form, () => {
                console.log(`Renaming ${thingType} ${thing.name} with ID: ${thing.id} to ${form.dataset.string}`);
                sendHandlers.renameThing(thingType, thing.id, form.dataset.string);
            });
            console.log('Rename button clicked!');
        });
        return renameButtonElm;
    },
    replyContainer: function (replyMessageId) {
        let replyContainer = document.createElement("div");
        replyContainer.className = "chat-reply-container";

        let replyText = document.createElement("p");
        replyText.className = "chat-message-body reply-text";
        replyText.style = "font-size: 10px;";
        replyText.textContent = "↪ Reply to:";
        replyContainer.append(replyText);

        let referencedUsername = document.createElement("p");
        referencedUsername.className = "chat-message-username";
        referencedUsername.style = "margin-right: 10px; font-size: 10px;";
        replyContainer.append(referencedUsername);

        let referencedBody = document.createElement("p");
        referencedBody.className = "chat-message-body";
        referencedBody.style = "font-size: 10px;";
        replyContainer.append(referencedBody);

        let referencedMessage = findMessageElmById(replyMessageId)?.querySelector(".chat-message-div");

        if (referencedMessage) {
            referencedUsername.textContent = referencedMessage.querySelector(".chat-message-username")?.textContent || "Unknown User";
            referencedBody.textContent = referencedMessage.querySelector(".chat-message-body")?.textContent || "";
        } else {
            referencedUsername.textContent = "";
            referencedBody.textContent = "Message not found";
        }
        return replyContainer;
    }
    
}

export function createPopup (form, onSubmit) {
    function destroy(element) {
        element.remove();
    }
    let popup = document.createElement("dialog");
    popup.open = true;
    popup.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            form.requestSubmit();
        } else if (event.key === "Escape") {
            event.preventDefault();
            destroy(popup);
            destroy(obscure);
        }
    });
    let obscure = document.createElement("div");
    obscure.className = "obscure";
    obscure.addEventListener("click", () => {
        destroy(popup);
        destroy(obscure);
    });
    form.method = "dialog";
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log("Form submitted.");
        onSubmit();
        destroy(popup);
        destroy(obscure);
    });
    form.addEventListener("reset", () => {
        console.log("Form cancelled.");
        destroy(popup);
        destroy(obscure);
    })
    popup.appendChild(form);
    document.body.appendChild(obscure);
    document.body.appendChild(popup);
}

export function updateUserPfp(id) {
    for (let e of document.querySelectorAll(`img[alt="${id}"]`)) {
        e.src = pfpLink(id)
    }
}

export function hideContextMenus() {
    const contextMenus = document.getElementsByClassName('context-menu');
    for (let menu of contextMenus) {
        menu.classList.add("hidden");
    }
}