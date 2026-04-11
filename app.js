const DOM = {
    install: document.getElementById('install-screen'),
    splash: document.getElementById('splash-screen'),
    onboarding: document.getElementById('onboarding-screen'),
    success: document.getElementById('success-screen'),
    app: document.getElementById('app-screen'),
    chatView: document.getElementById('chat-view'),
    nameInput: document.getElementById('user-name-input'),
    generateBtn: document.getElementById('generate-id-btn'),
    statusMsg: document.getElementById('onboarding-status'),
    displayId: document.getElementById('display-id'),
    startChatBtn: document.getElementById('start-chatting-btn'),
    myNameDisplay: document.getElementById('my-name-display'),
    myIdDisplay: document.getElementById('my-id-display'),
    myAvatar: document.getElementById('my-profile-pic'),
    backBtn: document.getElementById('back-to-list'),
    chatItemsList: document.getElementById('chat-items-list'),
    // Avatar elements
    avatarPreviewImg: document.getElementById('avatar-preview-img'),
    // Settings elements
    settingsBtn: document.getElementById('settings-btn'),
    settingsDropdown: document.getElementById('settings-dropdown'),
    editProfileBtn: document.getElementById('edit-profile-btn'),
    deleteAccountBtn: document.getElementById('delete-account-btn'),
    // Modals
    deleteModal: document.getElementById('delete-modal'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    editProfileModal: document.getElementById('edit-profile-modal'),
    editAvatarPreviewImg: document.getElementById('edit-avatar-preview-img'),
    editNameInput: document.getElementById('edit-name-input'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    saveEditBtn: document.getElementById('save-edit-btn'),
    editZoomSlider: document.getElementById('edit-zoom-slider'),
    editYSlider: document.getElementById('edit-y-slider'),
    editXSlider: document.getElementById('edit-x-slider'),
    editGalleryBtn: document.getElementById('edit-gallery-btn'),
    editGalleryInput: document.getElementById('edit-gallery-input'),
    onboardingYSlider: null, // Removed
    onboardingXSlider: null, // Removed
    onboardingGalleryBtn: null, // Removed
    onboardingGalleryInput: null, // Removed
    attachBtn: document.getElementById('attach-btn'),
    chatFileInput: document.getElementById('chat-file-input'),
    imagePreviewArea: document.getElementById('image-preview-container'),
    imagePreviewImg: document.getElementById('image-preview-img'),
    closePreviewBtn: document.getElementById('close-preview-btn'),
    // Lightbox
    lightbox: document.getElementById('image-lightbox'),
    lightboxImg: document.getElementById('lightbox-img'),
    closeLightboxBtn: document.getElementById('close-lightbox'),
    // Reply
    replyArea: document.getElementById('reply-preview-container'),
    replyName: document.getElementById('reply-preview-name'),
    replyText: document.getElementById('reply-preview-text'),
    closeReplyBtn: document.getElementById('close-reply-btn'),
    // Delete Msg
    msgDeleteModal: document.getElementById('delete-msg-modal'),
    confirmMsgDelete: document.getElementById('confirm-msg-delete'),
    cancelMsgDelete: document.getElementById('cancel-msg-delete'),
    // Search & Add Contact
    searchInput: document.getElementById('chat-search-input'),
    openAddModalBtn: document.getElementById('open-add-modal-btn'),
    addContactModal: document.getElementById('add-contact-modal'),
    newContactIdInput: document.getElementById('new-contact-id'),
    saveContactBtn: document.getElementById('save-contact-btn'),
    cancelAddBtn: document.getElementById('cancel-add-btn'),
    // Permissions
    permissionModal: document.getElementById('permission-modal'),
    allowNotifBtn: document.getElementById('allow-notifications-btn')
};

let replyToMsgObj = null;
let msgToDeleteObj = null;

let currentUser = null;
let mqttClient = null;
let activeChatObj = null;
let chatList = JSON.parse(localStorage.getItem('mchat_chatlist')) || {};
let generatedAvatarUrl = null; 

let deferredPrompt = null;

async function initApp() {
    console.log("Initializing M-Chat (Universal Inbox Architecture)...");
    
    // Check if app is already running in "Native" standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    
    if (isStandalone) {
        startBootFlow();
    } else {
        // We still show the install screen but allow skipping
        showScreen('install');
        // If they already have data, maybe they just want to use the web version
        if (localStorage.getItem('mchat_currentUser')) {
            startBootFlow(); 
        }
    }
}

// Global binding for the skip button
document.addEventListener('DOMContentLoaded', () => {
    const skipBtn = document.getElementById('skip-install-btn');
    if (skipBtn) skipBtn.onclick = () => startBootFlow();
});

// Separate boot flow for cleaner logic
async function startBootFlow() {
    showScreen('splash');
    
    // Safety Valve: If app sticks on splash for >5s, force move
    const safetyValve = setTimeout(() => {
        if (DOM.splash.classList.contains('active')) {
            console.warn("Safety valve triggered: forcing boot...");
            finalizeBoot();
        }
    }, 5000);

    const splashDelay = new Promise(res => setTimeout(res, 800)); // Shorter delay
    await splashDelay;
    
    try {
        finalizeBoot();
    } catch (err) {
        console.error("Boot failure:", err);
        showScreen('onboarding'); // Fallback
    }
    clearTimeout(safetyValve);
}

function finalizeBoot() {
    const localData = localStorage.getItem('mchat_currentUser');
    if (localData) {
        try {
            currentUser = JSON.parse(localData);
            if (!currentUser || !currentUser.id || !currentUser.name) throw new Error("Invalid user data");
            loadMainApp();
        } catch(e) {
            console.error("Local data corrupted or app failure:", e);
            localStorage.removeItem('mchat_currentUser'); // Clear bad data
            showScreen('onboarding');
        }
    } else {
        showScreen('onboarding');
    }
}

// Handle PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install screen if we were waiting for it
    if (!window.matchMedia('(display-mode: standalone)').matches) {
       showScreen('install');
    }
});

document.getElementById('pwa-install-btn').onclick = async () => {
    if (!deferredPrompt) {
        alert("Installation is already in progress or not supported by this browser. Check your browser menu/address bar.");
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        startBootFlow();
    }
    deferredPrompt = null;
};

// --- Screen Switching Logic ---

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    if (screenName === 'install') DOM.install.classList.add('active');
    if (screenName === 'splash') DOM.splash.classList.add('active');
    if (screenName === 'onboarding') DOM.onboarding.classList.add('active');
    if (screenName === 'success') DOM.success.classList.add('active');
    if (screenName === 'app') DOM.app.classList.add('active');
}

function createLetterAvatar(name) {
    if (!name) name = "?";
    const firstLetter = name.charAt(0).toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Consistent color based on name
    const colors = ['#4fb087', '#4a90e2', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c', '#f1c40f', '#e67e22', '#34495e'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(firstLetter, 50, 52); // Slight offset for visual balance
    
    return canvas.toDataURL();
}


// --- Account Generation ---

DOM.generateBtn.addEventListener('click', async () => {
    const name = DOM.nameInput.value.trim();
    if (!name) {
        DOM.statusMsg.innerText = "Please enter your name first.";
        return;
    }

    DOM.generateBtn.disabled = true;
    DOM.generateBtn.innerText = "Generating...";
    DOM.statusMsg.innerText = "Generating secure ID...";

    const avatar = createLetterAvatar(name);
    
    const random6 = Math.floor(100000 + Math.random() * 900000);
    const uniqueIdString = "0200" + random6.toString();
    
    currentUser = {
        id: uniqueIdString,
        name: name,
        avatar: avatar,
        createdAt: new Date().toISOString()
    };

    localStorage.setItem('mchat_currentUser', JSON.stringify(currentUser));
    
    DOM.displayId.innerText = uniqueIdString;
    showScreen('success');
});

DOM.startChatBtn.addEventListener('click', () => {
    loadMainApp();
});


// --- Main App & MQTT Logic ---

function loadMainApp() {
    try {
        if (!currentUser) return showScreen('onboarding');

        // Header
        DOM.myNameDisplay.innerText = currentUser.name;
        DOM.myIdDisplay.innerText = "ID: " + currentUser.id;
        DOM.myAvatar.src = createLetterAvatar(currentUser.name);
        DOM.myAvatar.style.transform = `none`;

        showScreen('app');
        
        initMQTT();
        
        // Setup UI bindings once
        const addBtn = document.getElementById('add-friend-btn');
        if (addBtn && !addBtn.dataset.bound) {
            addBtn.addEventListener('click', startNewChat);
            addBtn.dataset.bound = "true";
        }
        renderChatList();
    } catch (err) {
        console.error("Main app load error:", err);
        showScreen('onboarding');
    }
}

function initMQTT() {
    if (typeof mqtt === 'undefined') {
        console.warn("MQTT library not loaded yet. Retrying in 1s...");
        setTimeout(initMQTT, 1000);
        return;
    }

    const clientId = 'mchat_' + currentUser.id + '_' + Math.random().toString(16).substr(2, 4);
    // Correct port for WSS on HiveMQ is 8884
    const host = 'wss://broker.hivemq.com:8884/mqtt'; 
    
    console.log("Connecting to HiveMQ Broker (WSS)...");
    mqttClient = mqtt.connect(host, {
        clientId: clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 2000,
        // Last Will: If we disconnect, others see us as offline with a timestamp
        will: {
            topic: `mchat/status/${currentUser.id}`,
            payload: JSON.stringify({ status: "offline", lastSeen: Date.now() }),
            qos: 1,
            retain: true
        }
    });

    mqttClient.on('connect', () => {
        console.log('Connected to MQTT. Setting up Universal Inbox, Directory, and Status.');
        
        // Update presence to Online (Retained)
        updateStatus("online");
        
        // 1. Publish our presence to the Global Directory with "Retain"
        // This ensures anyone searching for our ID finds our profile instantly
        const profileStr = JSON.stringify({
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            avatarZoom: currentUser.avatarZoom || 1.7,
            avatarX: currentUser.avatarX || 0,
            avatarY: currentUser.avatarY || 0
        });
        mqttClient.publish(`mchat/directory/${currentUser.id}`, profileStr, { retain: true });

        // 2. Subscribe to our Personal Inbox to receive messages anywhere
        mqttClient.subscribe(`mchat/inbox/${currentUser.id}`, { qos: 1 });

        // 3. Dynamic Profile Sync: Subscribe to all friends' directory topics
        // This ensures we have their latest name/avatar even if we were offline
        Object.keys(chatList).forEach(friendId => {
            mqttClient.subscribe(`mchat/directory/${friendId}`);
        });
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const raw = message.toString();

            // 1. Handle Global Directory Updates (Retained Messages)
            if (topic.startsWith('mchat/directory/')) {
                const friendId = topic.split('/').pop();
                if (friendId === currentUser.id) return;

                if (!raw || raw === "" || raw === "null") {
                    // Account was deleted!
                    if (chatList[friendId]) {
                        chatList[friendId].deleted = true;
                        chatList[friendId].lastMsg = "This account is deleted";
                        saveChatList();
                        renderChatList();
                        
                        // If currently chatting with them, Close it
                        if (activeChatObj && activeChatObj.id === friendId) {
                            alert("This account has been deleted.");
                            DOM.backBtn.click();
                        }
                    }
                    return;
                }

                const payload = JSON.parse(raw);
                if (chatList[friendId] && payload && payload.name) {
                    console.log(`Syncing profile for ${friendId}...`);
                    chatList[friendId].deleted = false; 
                    updateChatList(payload.id, payload.name, payload.avatar, undefined, payload.avatarZoom, payload.avatarX, payload.avatarY);
                    
                    // Live update header if chatting
                    if (activeChatObj && activeChatObj.id === friendId) {
                        document.getElementById('active-chat-name').innerText = payload.name;
                        const mini = document.getElementById('active-chat-avatar');
                        mini.src = payload.avatar || createLetterAvatar(payload.name);
                        mini.style.transform = `none`;
                    }
                }
                return;
            }

            // 2. Handle Other Messages
            const payload = JSON.parse(raw);
            
            // Handle Inbox Messages
            if (topic === `mchat/inbox/${currentUser.id}`) {
                handleInboxMessage(payload);
                
                // Show Notification if not in chat
                if (activeChatObj?.id !== payload.senderId || document.visibilityState !== 'visible') {
                    showLocalNotification(payload.senderName, payload.image ? "📷 Photo" : payload.text, payload.senderAvatar);
                }
            }
            
            // Handle Status Updates
            if (topic.startsWith('mchat/status/') && activeChatObj) {
                const friendId = topic.split('/').pop();
                if (friendId === activeChatObj.id) {
                    updateStatusUI(payload);
                }
            }

            // --- Real-time Auto-Delete Logic ---
            
            // Handle READ_RECEIPT: If our messages were seen, delete them
            // Handle CHAT_CLOSED_DELETE: When friend finishes reading, delete on our side too
            if (payload.type === "CHAT_CLOSED_DELETE") {
                const roomId = getChatRoomId(currentUser.id, payload.senderId);
                localStorage.removeItem(roomId);
                updateChatList(payload.senderId, chatList[payload.senderId].name, chatList[payload.senderId].avatar, "All read & deleted");
                if (activeChatObj && activeChatObj.id === payload.senderId) {
                    renderLocalMessages();
                }
                return;
            }

            // Handle DELETE_SINGLE_MSG: Unsend message
            if (payload.type === "DELETE_SINGLE_MSG") {
                removeSingleMessageLocally(payload.roomId, payload.msgId);
                if (activeChatObj && activeChatObj.id === payload.friendId) {
                    renderLocalMessages();
                }
                return;
            }
        } catch (e) {
            console.error("Message error:", e);
        }
    });
}

function getChatRoomId(id1, id2) {
    return "mchat_room_" + [id1, id2].sort().join('_');
}


// --- Chat List & Inbox Utilities ---

function updateChatList(id, name, avatar, lastText) {
    if (!id) return;
    if (!chatList[id]) {
        chatList[id] = { id, name, avatar, lastMessage: "", timestamp: Date.now() };
    }
    // Always overwrite with newest info if provided (avoid undefined)
    if (name) {
        chatList[id].name = name;
        chatList[id].avatar = avatar || createLetterAvatar(name);
    }
    
    if (lastText !== undefined) {
        chatList[id].lastMessage = lastText;
        chatList[id].timestamp = Date.now();
    }
    
    localStorage.setItem('mchat_chatlist', JSON.stringify(chatList));
    renderChatList();
}

function renderChatList(filter = "") {
    const container = document.getElementById('chat-items-list');
    container.innerHTML = "";
    
    let ordered = Object.values(chatList).sort((a,b) => b.timestamp - a.timestamp);
    
    if (filter) {
        ordered = ordered.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()) || c.id.includes(filter));
    }

    if (ordered.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#aaa;">${filter ? "No contacts found." : "No chats yet. Click + to add a friend!"}</p>`;
        return;
    }
    
    ordered.forEach(c => {
        const isDeleted = c.deleted === true;
        const div = document.createElement('div');
        div.className = 'chat-item ripple';
        if (isDeleted) div.style.opacity = '0.6';

        div.onclick = () => {
            if (isDeleted) {
                alert("This account has been deleted.");
                return;
            }
            c.unread = 0; // Clear unread on open
            saveChatList();
            openChatView(c.name, c.id, c.avatar, c.avatarZoom, c.avatarX, c.avatarY);
        };
        
        const timeStr = new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
        const unreadBadge = (c.unread > 0 && !isDeleted) ? `<span class="unread-count">${c.unread}</span>` : "";
        
        div.innerHTML = `
            <div class="avatar-box">
                <img src="${c.avatar || createLetterAvatar(c.name)}" alt="${c.name}" style="${isDeleted ? 'filter: grayscale(1); opacity: 0.5;' : ''}">
            </div>
            <div class="chat-info">
                <div class="chat-top">
                    <span class="chat-name">${c.name} ${isDeleted ? "<span style='font-size:0.8rem; color:red; margin-left:5px;'>(Account Deleted)</span>" : ""}</span>
                    <span class="chat-time">${timeStr}</span>
                </div>
                <div class="chat-bottom">
                    <span class="chat-preview">${isDeleted ? "This account is deleted" : c.lastMessage}</span>
                    ${unreadBadge}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function saveChatList() {
    localStorage.setItem('mchat_chatlist', JSON.stringify(chatList));
}

// Directory Search & Friend Adding
function startNewChat() {
    const friendId = DOM.newContactIdInput.value.trim();
    if(friendId.length < 5 || friendId === currentUser.id) return alert("Invalid ID");
    
    DOM.saveContactBtn.innerText = "Checking...";
    DOM.saveContactBtn.disabled = true;

    // We verify by subscribing to their directory topic
    const directoryTopic = `mchat/directory/${friendId}`;
    let found = false;

    // Temporary listener to catch the retained directory message
    const directoryListener = (topic, message) => {
        if (topic === directoryTopic) {
            found = true;
            const raw = message.toString();
            if (!raw || raw === "" || raw === "null") {
                mqttClient.unsubscribe(directoryTopic);
                mqttClient.removeListener('message', directoryListener);
                alert("This account has been deleted.");
                DOM.saveContactBtn.innerText = "Save Contact";
                DOM.saveContactBtn.disabled = false;
                return;
            }

            try {
                const profile = JSON.parse(raw);
                mqttClient.unsubscribe(directoryTopic);
                mqttClient.removeListener('message', directoryListener);
                
                // Add to Chat List
                updateChatList(profile.id, profile.name, profile.avatar, "");
                
                // Reset UI & Open Chat
                DOM.newContactIdInput.value = "";
                DOM.saveContactBtn.innerText = "Save Contact";
                DOM.saveContactBtn.disabled = false;
                DOM.addContactModal.style.display = 'none';
                
                openChatView(profile.name, profile.id, profile.avatar);
            } catch(e) {
                console.error("Discovery parse error:", e);
            }
        }
    };
    
    mqttClient.on('message', directoryListener);
    mqttClient.subscribe(directoryTopic);
    
    // Timeout after 3 seconds if account doesn't exist (no retained message)
    setTimeout(() => {
        if (!found) {
            mqttClient.unsubscribe(directoryTopic);
            mqttClient.removeListener('message', directoryListener);
            alert("This account does not exist.");
            DOM.saveContactBtn.innerText = "Save Contact";
            DOM.saveContactBtn.disabled = false;
        }
    }, 4000);
}

// --- Search & Add Modal Listeners ---
if (DOM.searchInput) {
    DOM.searchInput.addEventListener('input', (e) => {
        renderChatList(e.target.value);
    });
}

if (DOM.openAddModalBtn) {
    DOM.openAddModalBtn.onclick = () => {
        DOM.addContactModal.style.display = 'flex';
        DOM.newContactIdInput.focus();
    };
    DOM.cancelAddBtn.onclick = () => DOM.addContactModal.style.display = 'none';
    DOM.saveContactBtn.onclick = startNewChat;
}

// --- Chat View & Messaging ---

function openChatView(name, id, avatar, zoom, x, y) {
    if (activeChatObj && mqttClient) {
        // Unsubscribe from previous friend's status
        mqttClient.unsubscribe(`mchat/status/${activeChatObj.id}`);
    }

    activeChatObj = { id, name, avatar, zoom, x, y };
    document.getElementById('active-chat-name').innerText = name;
    
    // Status Reset
    document.getElementById('header-status').innerText = "...";

    const mini = document.getElementById('active-chat-avatar');
    mini.src = avatar || createLetterAvatar(name);
    mini.style.transform = `none`;
    DOM.chatView.classList.add('open');
    
    // Show local history
    renderLocalMessages();

    // Subscribe to current friend's status
    if (mqttClient) {
        mqttClient.subscribe(`mchat/status/${id}`);
    }
}

// --- Chat Closure and Auto-Delete Finalisation ---
function closeActiveChatAndClear() {
    if (!activeChatObj || !mqttClient) return;

    const friendId = activeChatObj.id;
    const roomId = getChatRoomId(currentUser.id, friendId);

    // Get current messages to see if we reached 'Recipient' status
    const msgs = JSON.parse(localStorage.getItem(roomId)) || [];
    const hasReceived = msgs.some(m => m.senderId === friendId);

    // ONLY delete and notify if we were the recipient of some messages
    // If we only SENT messages, we wait for the OTHER person to seen and delete.
    if (hasReceived) {
        // 1. Send FINAL deletion signal to friend
        const closeSignal = {
            type: "CHAT_CLOSED_DELETE",
            senderId: currentUser.id,
            timestamp: Date.now()
        };
        mqttClient.publish(`mchat/inbox/${friendId}`, JSON.stringify(closeSignal));

        // 2. Delete locally
        localStorage.removeItem(roomId);
        
        // 3. Update UI
        updateChatList(friendId, activeChatObj.name, activeChatObj.avatar, "All read & deleted");
    }
    
    // 4. Reset View State (Always)
    mqttClient.unsubscribe(`mchat/status/${friendId}`);
    activeChatObj = null;
    DOM.chatView.classList.remove('open');
    renderChatList();
}

DOM.backBtn.onclick = () => {
    closeActiveChatAndClear();
};

function getLocalMessages() {
    if (!activeChatObj) return [];
    const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
    const stored = localStorage.getItem(roomId);
    return stored ? JSON.parse(stored) : [];
}

function saveLocalMessage(roomId, msgObj) {
    let stored = localStorage.getItem(roomId);
    let msgs = stored ? JSON.parse(stored) : [];
    // Deduplication check
    if (!msgs.find(m => m.msgId === msgObj.msgId)) {
        msgs.push(msgObj);
        localStorage.setItem(roomId, JSON.stringify(msgs));
        return true;
    }
    return false;
}

function renderLocalMessages() {
    if (!activeChatObj) return;
    const msgs = getLocalMessages();
    const container = document.getElementById('message-container');
    container.innerHTML = "";
    
    msgs.forEach(m => {
        appendSingleMessageUI(m, true);
    });
    container.scrollTop = container.scrollHeight;
}

function appendSingleMessageUI(m, isBatch = false) {
    const isSent = m.senderId === currentUser.id;
    const container = document.getElementById('message-container');
    
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper');
    wrapper.id = m.msgId; // Anchor for scrolling to replies
    
    // Swipe Icon
    const swipeIcon = document.createElement('div');
    swipeIcon.classList.add('swipe-reply-icon');
    swipeIcon.innerHTML = '↶';
    wrapper.appendChild(swipeIcon);

    const b = document.createElement('div');
    b.classList.add('message', isSent ? 'sent' : 'received');
    if (!isBatch) b.classList.add('fade-in');
    
    let contentHtml = "";
    
    // Add Reply Quote if exists
    if (m.replyTo) {
        contentHtml += `
            <div class="reply-quote" onclick="scrollToMessage('${m.replyTo.msgId}')">
                <div class="reply-quote-name">${m.replyTo.senderName}</div>
                <div class="reply-quote-text">${m.replyTo.text || (m.replyTo.image ? "📷 Photo" : "")}</div>
            </div>
        `;
    }

    if (m.image) {
        contentHtml += `<img src="${m.image}" style="width:100%; border-radius:8px; margin-bottom:5px; display:block;">`;
    }
    if (m.text) {
        contentHtml += `<div>${m.text}</div>`;
    }
    
    const timeStr = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
    b.innerHTML = `${contentHtml} <span class="message-time">${timeStr}</span>`;
    
    // Add click listener to image for lightbox
    const img = b.querySelector('img');
    if (img) {
        img.onclick = () => openLightbox(img.src);
    }
    
    wrapper.appendChild(b);
    container.appendChild(wrapper);

    // Swipe For Mobile, Right Click for Laptop/Desktop
    initSwipe(b, m);
    b.oncontextmenu = (e) => {
        e.preventDefault();
        showReplyPreview(m);
        if (window.navigator.vibrate) window.navigator.vibrate(20);
    };

    // Initialise Long Press for this message (Delete for everyone)
    initLongPress(b, m);

    if (!isBatch) container.scrollTop = container.scrollHeight;
}

function initLongPress(el, msgObj) {
    let timer;
    const duration = 600;

    const start = (e) => {
        timer = setTimeout(() => {
            if (msgObj.senderId === currentUser.id) {
                // Trigger Delete for everyone
                msgToDeleteObj = msgObj;
                DOM.msgDeleteModal.style.display = 'flex';
                if (window.navigator.vibrate) window.navigator.vibrate([30, 10, 30]);
            }
        }, duration);
    };

    const cancel = () => {
        clearTimeout(timer);
    };

    el.addEventListener('touchstart', start, {passive: true});
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
}

DOM.cancelMsgDelete.onclick = () => DOM.msgDeleteModal.style.display = 'none';
DOM.confirmMsgDelete.onclick = () => {
    if (msgToDeleteObj && mqttClient) {
        const deletePayload = {
            type: "DELETE_SINGLE_MSG",
            msgId: msgToDeleteObj.msgId,
            friendId: currentUser.id, // who sent it
            roomId: getChatRoomId(currentUser.id, activeChatObj.id)
        };
        mqttClient.publish(`mchat/inbox/${activeChatObj.id}`, JSON.stringify(deletePayload));
        
        // Remove locally too
        removeSingleMessageLocally(deletePayload.roomId, deletePayload.msgId);
        renderLocalMessages();
    }
    DOM.msgDeleteModal.style.display = 'none';
};

function removeSingleMessageLocally(roomId, msgId) {
    let msgs = JSON.parse(localStorage.getItem(roomId)) || [];
    msgs = msgs.filter(m => m.msgId !== msgId);
    localStorage.setItem(roomId, JSON.stringify(msgs));
}

function initSwipe(el, msgObj) {
    let startX = 0;
    let dist = 0;
    const threshold = 60;

    el.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        el.style.transition = 'none';
        el.classList.add('swiping-right');
    }, {passive: true});

    el.addEventListener('touchmove', (e) => {
        const currentX = e.touches[0].clientX;
        dist = currentX - startX;
        if (dist > 0 && dist < 100) {
            el.style.transform = `translateX(${dist}px)`;
            // Provide haptic feedback if reached threshold
            if (dist >= threshold && !el.dataset.triggered) {
                if (window.navigator.vibrate) window.navigator.vibrate(10);
                el.dataset.triggered = "true";
            }
        }
    }, {passive: true});

    el.addEventListener('touchend', () => {
        el.style.transition = 'transform 0.2s ease';
        el.style.transform = 'translateX(0px)';
        el.classList.remove('swiping-right');
        
        if (dist >= threshold) {
            showReplyPreview(msgObj);
        }
        dist = 0;
        el.dataset.triggered = "";
    });
}

function showReplyPreview(m) {
    replyToMsgObj = m;
    DOM.replyName.innerText = m.senderId === currentUser.id ? "You" : m.senderName;
    DOM.replyText.innerText = m.text || (m.image ? "📷 Photo" : "");
    DOM.replyArea.style.display = "block";
    document.getElementById('message-input').focus();
}

DOM.closeReplyBtn.onclick = () => {
    replyToMsgObj = null;
    DOM.replyArea.style.display = "none";
};
function handleInboxMessage(payload) {
    if (!payload || !payload.senderId) return;

    // Guard: Don't process non-message signals as standard messages
    const signalTypes = ["READ_RECEIPT", "CHAT_CLOSED_DELETE", "DELETE_SINGLE_MSG"];
    if (payload.type && signalTypes.includes(payload.type)) return;

    const roomId = getChatRoomId(currentUser.id, payload.senderId);
    
    // Handle Profile Update Signal
    if (payload.type === "PROFILE_UPDATE") {
        updateChatList(payload.id, payload.name, payload.avatar);
        // If viewing this chat, update the header live
        if (activeChatObj && activeChatObj.id === payload.id) {
            document.getElementById('active-chat-name').innerText = payload.name;
            const mini = document.getElementById('active-chat-avatar');
            mini.src = payload.avatar || createLetterAvatar(payload.name);
            mini.style.transform = `none`;
            // Update active object state too
            activeChatObj.name = payload.name;
            activeChatObj.avatar = payload.avatar;
        }
        return;
    }

    // Handle Delete History Signal
    if (payload.type === "DELETE_HISTORY") {
        const friendRoomId = getChatRoomId(currentUser.id, payload.senderId);
        localStorage.removeItem(friendRoomId);
        // Clear last message in chat list too
        updateChatList(payload.senderId, payload.senderName, payload.senderAvatar, "Chat history cleared");
        // If viewing this chat, re-render
        if (activeChatObj && activeChatObj.id === payload.senderId) {
            document.getElementById('active-chat-name').innerText = payload.senderName;
            const mini = document.getElementById('active-chat-avatar');
            mini.src = payload.senderAvatar || createLetterAvatar(payload.senderName);
            mini.style.transform = `none`;
            renderLocalMessages();
        }
        return;
    }

    // Save to device message history
    if (saveLocalMessage(roomId, payload)) {
        
        // WhatsApp Logic: Update chat list preview
        const previewText = payload.image ? "📷 Photo" : payload.text;
        
        // Track unread if not currently looking at this chat
        const isNotActive = !activeChatObj || activeChatObj.id !== payload.senderId;
        const currentUnread = (chatList[payload.senderId]?.unread || 0) + (isNotActive ? 1 : 0);
        
        updateChatList(payload.senderId, payload.senderName, payload.senderAvatar, previewText);
        chatList[payload.senderId].unread = currentUnread;
        saveChatList();
        renderChatList();

        // Notification Sound
        if (isNotActive) {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(()=>{});
        }
        
        // If we are currently actively looking at their chat, render the bubble
        if (activeChatObj && activeChatObj.id === payload.senderId) {
            // Update the live header name/avatar if they changed
            document.getElementById('active-chat-name').innerText = payload.senderName;
            const mini = document.getElementById('active-chat-avatar');
            mini.src = payload.senderAvatar || createLetterAvatar(payload.senderName);
            mini.style.transform = `none`;
            
            appendSingleMessageUI(payload);
        }
    }
}

DOM.backBtn.addEventListener('click', () => {
    if (activeChatObj && mqttClient) {
        // Unsubscribe from status updates to save bandwidth
        mqttClient.unsubscribe(`mchat/status/${activeChatObj.id}`);
        
        // Final Auto-Delete on Seen: When we leave, we've seen everything
        const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
        localStorage.removeItem(roomId);
        updateChatList(activeChatObj.id, activeChatObj.name, activeChatObj.avatar, "All seen & deleted");
    }
    DOM.chatView.classList.remove('open');
    activeChatObj = null;
});

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMessage();
});

// --- Paste Image Support ---
document.getElementById('message-input').addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                pendingImage = event.target.result;
                DOM.imagePreviewImg.src = pendingImage;
                DOM.imagePreviewArea.style.display = "block";
            };
            reader.readAsDataURL(blob);
        }
    }
});

// --- Chat Image Handling Logic ---
let pendingImage = null;

DOM.attachBtn.onclick = () => DOM.chatFileInput.click();
DOM.chatFileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        pendingImage = event.target.result;
        DOM.imagePreviewImg.src = pendingImage;
        DOM.imagePreviewArea.style.display = "block";
    };
    reader.readAsDataURL(file);
};

DOM.closePreviewBtn.onclick = () => {
    pendingImage = null;
    DOM.imagePreviewArea.style.display = "none";
    DOM.chatFileInput.value = "";
};

// --- Image Compression Utility ---
async function compressImage(base64Str, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if(!text && !pendingImage) return; 
    if(!activeChatObj || !mqttClient) return;

    input.value = ""; 
    const currentPendingImage = pendingImage; // Capture it
    const currentReplyTo = replyToMsgObj; // Capture it
    pendingImage = null;
    replyToMsgObj = null;
    DOM.imagePreviewArea.style.display = "none";
    DOM.replyArea.style.display = "none";
    DOM.chatFileInput.value = "";
    
    let processedImage = null;
    if (currentPendingImage) {
        processedImage = await compressImage(currentPendingImage);
    }
    
    const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
    
    const msgPayload = {
        msgId: 'msg_' + Math.random().toString(36).substr(2, 9),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        senderAvatarZoom: currentUser.avatarZoom || 1.7,
        senderAvatarX: currentUser.avatarX || 0,
        senderAvatarY: currentUser.avatarY || 0,
        text: text,
        image: processedImage, 
        replyTo: currentReplyTo ? {
            msgId: currentReplyTo.msgId,
            senderName: currentReplyTo.senderName,
            text: currentReplyTo.text,
            image: currentReplyTo.image
        } : null,
        timestamp: Date.now()
    };
    
    if (saveLocalMessage(roomId, msgPayload)) {
        appendSingleMessageUI(msgPayload);
        const previewText = msgPayload.image ? "📷 Photo" : msgPayload.text;
        updateChatList(activeChatObj.id, activeChatObj.name, activeChatObj.avatar, previewText, activeChatObj.avatarZoom, activeChatObj.avatarX, activeChatObj.avatarY);
    }
    
    mqttClient.publish(`mchat/inbox/${activeChatObj.id}`, JSON.stringify(msgPayload), { qos: 1 });
}

// --- Settings & Profile Logic ---

if (DOM.settingsBtn) {
    // --- Hard Refresh ---
    const hardRefreshBtn = document.getElementById('hard-refresh-btn');
    if (hardRefreshBtn) {
        hardRefreshBtn.addEventListener('click', () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                        registration.unregister();
                    }
                    // Clear caches if supported
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            for (let name of names) caches.delete(name);
                        });
                    }
                    setTimeout(() => {
                        window.location.reload(true);
                    }, 500);
                });
            } else {
                window.location.reload(true);
            }
        });
    }

    DOM.settingsBtn.addEventListener('click', () => {
        DOM.settingsDropdown.style.display = DOM.settingsDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Click outside to close generic dropdowns
    document.addEventListener('click', (e) => {
        if (!DOM.settingsBtn.contains(e.target) && !DOM.settingsDropdown.contains(e.target)) {
            DOM.settingsDropdown.style.display = 'none';
        }
    });

    // --- Delete Account ---
    DOM.deleteAccountBtn.addEventListener('click', () => {
        DOM.settingsDropdown.style.display = 'none';
        DOM.deleteModal.style.display = 'flex';
    });

    DOM.cancelDeleteBtn.addEventListener('click', () => {
        DOM.deleteModal.style.display = 'none';
    });

    DOM.confirmDeleteBtn.addEventListener('click', () => {
        DOM.deleteModal.style.display = 'none';
        
        // 1. Remove self from global directory and status before disconnecting
        if(mqttClient && currentUser) {
            mqttClient.publish(`mchat/directory/${currentUser.id}`, "", { retain: true }); 
            mqttClient.publish(`mchat/status/${currentUser.id}`, "", { retain: true }); 
        }

        // 2. Clear all local state
        currentUser = null;
        chatList = {};
        activeChatObj = null;
        generatedAvatarUrl = null;
        localStorage.clear(); 
        
        // 3. Disconnect MQTT
        if (mqttClient) {
            mqttClient.end();
            mqttClient = null;
        }
        
        // 4. Reset Onboarding UI
        DOM.nameInput.value = "";
        DOM.displayId.innerText = "0200000000";
        DOM.generateBtn.disabled = false;
        DOM.generateBtn.innerText = "Generate Account";
        DOM.generateBtn.style.opacity = '1';
        DOM.statusMsg.innerText = '';
        
        // 5. Back to start
        showScreen('onboarding');
    });

    // --- Edit Profile ---
    DOM.editProfileBtn.addEventListener('click', () => {
        DOM.settingsDropdown.style.display = 'none';
        if (currentUser) {
            DOM.editNameInput.value = currentUser.name;
            DOM.editAvatarPreviewImg.src = currentUser.avatar;
            DOM.editAvatarPreviewImg.dataset.newUrl = "";
            
            // Set sliders from current user data
            currentZoom = currentUser.avatarZoom || 1.7;
            currentX = currentUser.avatarX || 0;
            currentY = currentUser.avatarY || 0;
            DOM.editZoomSlider.value = currentZoom;
            DOM.editXSlider.value = currentX;
            DOM.editYSlider.value = currentY;
            applyAvatarAdjustments();
            
            DOM.editProfileModal.style.display = 'flex';
        }
    });

    DOM.cancelEditBtn.addEventListener('click', () => {
        DOM.editProfileModal.style.display = 'none';
    });

    DOM.saveEditBtn.addEventListener('click', () => {
        const newName = DOM.editNameInput.value.trim();
        if (!newName) return alert("Name cannot be empty.");
        
        currentUser.name = newName;
        currentUser.avatar = createLetterAvatar(newName); 
        
        // Save locally
        localStorage.setItem('mchat_currentUser', JSON.stringify(currentUser));
        
        // Update UI Header
        DOM.myNameDisplay.innerText = currentUser.name;
        DOM.myAvatar.src = currentUser.avatar;
        DOM.myAvatar.style.transform = `none`;
        
        // Republish to global directory with retain
        if (mqttClient) {
            const profilePayload = {
                type: "PROFILE_UPDATE",
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar
            };
            
            const profileStr = JSON.stringify(profilePayload);
            mqttClient.publish(`mchat/directory/${currentUser.id}`, profileStr, { retain: true });
            
            // Push update to friends
            Object.keys(chatList).forEach(friendId => {
                mqttClient.publish(`mchat/inbox/${friendId}`, profileStr);
            });
        }
        
        DOM.editProfileModal.style.display = 'none';
    });
}

// --- Presence & Online Status ---

function updateStatus(status) {
    if (!mqttClient || !currentUser) return;
    const topic = `mchat/status/${currentUser.id}`;
    const payload = { status: status };
    if (status === "offline") payload.lastSeen = Date.now();
    
    mqttClient.publish(topic, JSON.stringify(payload), { retain: true, qos: 1 });
}

function updateStatusUI(payload) {
    const statusEl = document.getElementById('header-status');
    if (!statusEl) return;

    if (payload.status === "online") {
        statusEl.innerText = "online";
        statusEl.style.color = "#4fb087"; // Primary green
    } else {
        const lastSeen = payload.lastSeen || Date.now();
        const timeDiff = Date.now() - lastSeen;
        
        // Simple "last seen" formatting
        const timeStr = new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (timeDiff < 24 * 3600 * 1000) {
            statusEl.innerText = `last seen today at ${timeStr}`;
        } else {
            const dateStr = new Date(lastSeen).toLocaleDateString();
            statusEl.innerText = `last seen on ${dateStr}`;
        }
        statusEl.style.color = "var(--text-dim)";
    }
}

// Track when user leaves app
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        updateStatus("online");
    } else {
        updateStatus("offline");
        // Automated closure on tab-hide removed as per user request to avoid accidental deletion
    }
});

window.addEventListener('pagehide', () => {
    updateStatus("offline");
});

function scrollToMessage(msgId) {
    const el = document.getElementById(msgId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.backgroundColor = 'rgba(79, 176, 135, 0.2)';
        setTimeout(() => {
            el.style.backgroundColor = 'transparent';
        }, 1500);
    }
}

// Let's go!
checkPermissionModal();
window.addEventListener('DOMContentLoaded', initApp);

function checkPermissionModal() {
    const prompted = localStorage.getItem('mchat_notif_prompted');
    if (!prompted && Notification.permission !== 'granted') {
        setTimeout(() => {
            DOM.permissionModal.style.display = 'flex';
        }, 1500);
    }
}

DOM.allowNotifBtn.onclick = () => {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            localStorage.setItem('mchat_notif_prompted', 'true');
            DOM.permissionModal.style.display = 'none';
            new Notification("M-Chat", { body: "Notifications enabled successfully!", icon: "./icons/icon-192x192.png" });
        } else {
            alert("M-Chat requires notifications to work in the background. Please allow them in your browser/site settings.");
        }
    });
};

function showLocalNotification(senderName, text, avatar) {
    if (Notification.permission === 'granted') {
        const options = {
            body: text,
            icon: avatar || "./icons/icon-192x192.png",
            badge: "./icons/icon-192x192.png",
            timestamp: Date.now(),
            vibrate: [200, 100, 200],
            data: { url: window.location.href }
        };
        
        // Use Service Worker if available for better background behavior
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(senderName, options);
            });
        } else {
            new Notification(senderName, options);
        }
    }
}
