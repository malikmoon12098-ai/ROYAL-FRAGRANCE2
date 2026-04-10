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
    onboardingZoomSlider: document.getElementById('onboarding-zoom-slider'),
    onboardingYSlider: document.getElementById('onboarding-y-slider'),
    onboardingXSlider: document.getElementById('onboarding-x-slider'),
    onboardingGalleryBtn: document.getElementById('onboarding-gallery-btn'),
    onboardingGalleryInput: document.getElementById('onboarding-gallery-input'),
    attachBtn: document.getElementById('attach-btn'),
    chatFileInput: document.getElementById('chat-file-input'),
    imagePreviewArea: document.getElementById('image-preview-container'),
    imagePreviewImg: document.getElementById('image-preview-img'),
    closePreviewBtn: document.getElementById('close-preview-btn'),
    // Lightbox
    lightbox: document.getElementById('image-lightbox'),
    lightboxImg: document.getElementById('lightbox-img'),
    closeLightboxBtn: document.getElementById('close-lightbox')
};

let currentUser = null;
let mqttClient = null;
let activeChatObj = null;
let chatList = JSON.parse(localStorage.getItem('mchat_chatlist')) || {};
let generatedAvatarUrl = null; // Stores the Ready Player Me avatar URL
let isRetakingAvatar = false; // Checks if RPM is used for onboarding or edit profile

let deferredPrompt = null;

async function initApp() {
    console.log("Initializing M-Chat (Universal Inbox Architecture)...");
    
    // Check if app is already running in "Native" standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    
    if (isStandalone) {
        // Already installed and running as app - go straight to splash
        startBootFlow();
    } else {
        // Running in browser - show Install Screen first
        showScreen('install');
    }
}

// Separate boot flow for cleaner logic
async function startBootFlow() {
    showScreen('splash');
    const splashDelay = new Promise(res => setTimeout(res, 2000));
    await splashDelay;
    
    const localData = localStorage.getItem('mchat_currentUser');
    if (localData) {
        currentUser = JSON.parse(localData);
        loadMainApp();
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

// --- Simplified Automatic Avatar Logic ---

const DEFAULT_AVATARS = {
    male: "assets/avatar_male.png",
    female: "assets/avatar_female.png"
};

let currentGender = "male";

function updateOnboardingAvatar(gender) {
    currentGender = gender;
    const url = DEFAULT_AVATARS[gender];
    DOM.avatarPreviewImg.src = url;
    generatedAvatarUrl = url;
    
    // Update active UI state
    document.querySelectorAll('#onboarding-screen .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gender === gender);
    });
}

// Onboarding adjust logic
if (DOM.onboardingZoomSlider) {
    DOM.onboardingZoomSlider.oninput = (e) => {
        const val = e.target.value;
        DOM.avatarPreviewImg.style.transform = `scale(${val}) translateY(${DOM.onboardingYSlider.value}px)`;
    };
    DOM.onboardingYSlider.oninput = (e) => {
        const val = e.target.value;
        DOM.avatarPreviewImg.style.transform = `scale(${DOM.onboardingZoomSlider.value}) translate(${DOM.onboardingXSlider.value}px, ${val}px)`;
    };
    DOM.onboardingXSlider.oninput = (e) => {
        const val = e.target.value;
        DOM.avatarPreviewImg.style.transform = `scale(${DOM.onboardingZoomSlider.value}) translate(${val}px, ${DOM.onboardingYSlider.value}px)`;
    };
    DOM.onboardingGalleryBtn.onclick = () => DOM.onboardingGalleryInput.click();
    DOM.onboardingGalleryInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            DOM.avatarPreviewImg.src = dataUrl;
            generatedAvatarUrl = dataUrl;
        };
        reader.readAsDataURL(file);
    };
}

function updateEditAvatar(gender) {
    const url = DEFAULT_AVATARS[gender];
    DOM.editAvatarPreviewImg.src = url;
    DOM.editAvatarPreviewImg.dataset.newUrl = url;
    
    // Reset adjustments for default avatars
    DOM.editZoomSlider.value = 1.7;
    DOM.editYSlider.value = 0;
    DOM.editXSlider.value = 0;
    currentZoom = 1.7;
    currentY = 0;
    currentX = 0;
    applyAvatarAdjustments();
    
    // Update active UI state
    document.querySelectorAll('#edit-profile-modal .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gender === gender);
    });
}

function applyAvatarAdjustments() {
    if (DOM.editAvatarPreviewImg) {
        DOM.editAvatarPreviewImg.style.transform = `scale(${currentZoom}) translate(${currentX}px, ${currentY}px)`;
    }
}

// Sliders logic
DOM.editZoomSlider.oninput = (e) => {
    currentZoom = e.target.value;
    applyAvatarAdjustments();
};
DOM.editYSlider.oninput = (e) => {
    currentY = e.target.value;
    applyAvatarAdjustments();
};
DOM.editXSlider.oninput = (e) => {
    currentX = e.target.value;
    applyAvatarAdjustments();
};

function openLightbox(src) {
    DOM.lightboxImg.src = src;
    DOM.lightbox.style.display = "flex";
}

function closeLightbox() {
    DOM.lightbox.style.display = "none";
}

// Global Lightbox bindings
DOM.closeLightboxBtn.onclick = closeLightbox;
DOM.lightbox.onclick = (e) => {
    if (e.target === DOM.lightbox) closeLightbox();
};

// Gallery logic
DOM.editGalleryBtn.onclick = () => DOM.editGalleryInput.click();
DOM.editGalleryInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target.result;
        DOM.editAvatarPreviewImg.src = dataUrl;
        DOM.editAvatarPreviewImg.dataset.newUrl = dataUrl;
        // Don't reset sliders for gallery pics, let user adjust them
    };
    reader.readAsDataURL(file);
};

// Event Listeners for onboarding
document.getElementById('onboarding-male-btn').onclick = () => updateOnboardingAvatar('male');
document.getElementById('onboarding-female-btn').onclick = () => updateOnboardingAvatar('female');

// Event Listeners for edit profile
document.getElementById('edit-male-btn').onclick = () => updateEditAvatar('male');
document.getElementById('edit-female-btn').onclick = () => updateEditAvatar('female');

// Initialize default
generatedAvatarUrl = DEFAULT_AVATARS.male;
let currentZoom = 1.7;
let currentY = 0;
let currentX = 0;


// --- Account Generation ---

DOM.generateBtn.addEventListener('click', async () => {
    const name = DOM.nameInput.value.trim();
    if (!name) {
        DOM.statusMsg.innerText = "Please enter your name first.";
        return;
    }
    if (!generatedAvatarUrl) {
        DOM.statusMsg.innerText = "Please create your AI avatar first!";
        return;
    }

    DOM.generateBtn.disabled = true;
    DOM.generateBtn.innerText = "Generating...";
    DOM.statusMsg.innerText = "Generating secure ID...";

    const random6 = Math.floor(100000 + Math.random() * 900000);
    const uniqueIdString = "0200" + random6.toString();
    
    currentUser = {
        id: uniqueIdString,
        name: name,
        avatar: generatedAvatarUrl,
        avatarZoom: DOM.onboardingZoomSlider ? parseFloat(DOM.onboardingZoomSlider.value) : 1.7,
        avatarX: DOM.onboardingXSlider ? parseFloat(DOM.onboardingXSlider.value) : 0,
        avatarY: DOM.onboardingYSlider ? parseFloat(DOM.onboardingYSlider.value) : 0,
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
    if (!currentUser) return;

    // Header
    DOM.myNameDisplay.innerText = currentUser.name;
    DOM.myIdDisplay.innerText = "ID: " + currentUser.id;
    DOM.myAvatar.src = currentUser.avatar;
    DOM.myAvatar.style.transform = `scale(${currentUser.avatarZoom || 1.7}) translate(${currentUser.avatarX || 0}px, ${currentUser.avatarY || 0}px)`;

    showScreen('app');
    
    initMQTT();
    
    // Setup UI bindings
    document.getElementById('add-friend-btn').addEventListener('click', startNewChat);
    renderChatList();
}

function initMQTT() {
    const clientId = 'mchat_' + currentUser.id + '_' + Math.random().toString(16).substr(2, 4);
    const host = 'wss://broker.emqx.io:8084/mqtt';
    
    console.log("Connecting to MQTT broker...");
    mqttClient = mqtt.connect(host, {
        clientId: clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 2000,
    });

    mqttClient.on('connect', () => {
        console.log('Connected to MQTT. Setting up Universal Inbox and Directory.');
        
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
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            
            // Handle Inbox Messages
            if (topic === `mchat/inbox/${currentUser.id}`) {
                handleInboxMessage(payload);
            }
        } catch (e) {
            console.error("Message parse error:", e);
        }
    });
}

function getChatRoomId(id1, id2) {
    return "mchat_room_" + [id1, id2].sort().join('_');
}


// --- Chat List & Inbox Utilities ---

function updateChatList(id, name, avatar, lastText, avatarZoom, avatarX, avatarY) {
    if (!id) return;
    if (!chatList[id]) {
        chatList[id] = { id, name, avatar, lastMessage: "", timestamp: Date.now(), avatarZoom: 1.7, avatarX: 0, avatarY: 0 };
    }
    // Always overwrite with newest info if provided
    if (name) chatList[id].name = name;
    if (avatar) chatList[id].avatar = avatar;
    if (avatarZoom !== undefined) chatList[id].avatarZoom = avatarZoom;
    if (avatarX !== undefined) chatList[id].avatarX = avatarX;
    if (avatarY !== undefined) chatList[id].avatarY = avatarY;
    
    if (lastText !== undefined) {
        chatList[id].lastMessage = lastText;
        chatList[id].timestamp = Date.now();
    }
    
    localStorage.setItem('mchat_chatlist', JSON.stringify(chatList));
    renderChatList();
}

function renderChatList() {
    const container = document.getElementById('chat-items-list');
    container.innerHTML = "";
    
    const ordered = Object.values(chatList).sort((a,b) => b.timestamp - a.timestamp);
    
    if (ordered.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#aaa;">No chats yet. Enter a friend's ID to begin!</p>`;
        return;
    }
    
    ordered.forEach(c => {
        const div = document.createElement('div');
        div.className = 'chat-item ripple';
        div.onclick = () => openChatView(c.name, c.id, c.avatar);
        
        const timeStr = new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
        
        div.innerHTML = `
            <div class="avatar-box">
                <img src="${c.avatar}" alt="${c.name}" style="transform: scale(${c.avatarZoom || 1.7}) translate(${c.avatarX || 0}px, ${c.avatarY || 0}px)">
            </div>
            <div class="chat-info">
                <div class="chat-top">
                    <span class="chat-name">${c.name}</span>
                    <span class="chat-time">${timeStr}</span>
                </div>
                <div class="chat-bottom">
                    <span class="chat-preview">${c.lastMessage}</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Directory Search & Friend Adding
function startNewChat() {
    const friendId = document.getElementById('new-chat-input').value.trim();
    if(friendId.length < 5 || friendId === currentUser.id) return alert("Invalid ID");
    
    const addBtn = document.getElementById('add-friend-btn');
    addBtn.innerText = "Checking...";
    addBtn.disabled = true;

    // We verify by subscribing to their directory topic
    const directoryTopic = `mchat/directory/${friendId}`;
    let found = false;

    // Temporary listener to catch the retained directory message
    const directoryListener = (topic, message) => {
        if (topic === directoryTopic) {
            found = true;
            try {
                const profile = JSON.parse(message.toString());
                mqttClient.unsubscribe(directoryTopic);
                mqttClient.removeListener('message', directoryListener);
                
                // Add to Chat List
                updateChatList(profile.id, profile.name, profile.avatar, "", profile.avatarZoom, profile.avatarX, profile.avatarY);
                
                // Reset UI & Open Chat
                document.getElementById('new-chat-input').value = "";
                addBtn.innerText = "Start Chat";
                addBtn.disabled = false;
                
                openChatView(profile.name, profile.id, profile.avatar, profile.avatarZoom, profile.avatarX, profile.avatarY);
            } catch(e) {}
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
            addBtn.innerText = "Start Chat";
            addBtn.disabled = false;
        }
    }, 3000);
}

// --- Chat View & Messaging ---

function openChatView(name, id, avatar, zoom, x, y) {
    activeChatObj = { id, name, avatar, zoom, x, y };
    document.getElementById('active-chat-name').innerText = name;
    const mini = document.getElementById('active-chat-avatar');
    mini.src = avatar;
    mini.style.transform = `scale(${zoom || 1.7}) translate(${x || 0}px, ${y || 0}px)`;
    DOM.chatView.classList.add('open');
    
    // Just render stored history. We don't subscribe to a room anymore!
    // Our Universal Inbox catches new messages seamlessly.
    renderLocalMessages();
}

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
        const isSent = m.senderId === currentUser.id;
        const b = document.createElement('div');
        b.classList.add('message', isSent ? 'sent' : 'received');
        
        let contentHtml = "";
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
        
        container.appendChild(b);
    });
    container.scrollTop = container.scrollHeight;
}

function appendSingleMessageUI(m) {
    const isSent = m.senderId === currentUser.id;
    const container = document.getElementById('message-container');
    const b = document.createElement('div');
    b.classList.add('message', isSent ? 'sent' : 'received', 'fade-in');
    
    let contentHtml = "";
    if (m.image) {
        contentHtml += `<img src="${m.image}" style="width:100%; border-radius:8px; margin-bottom:5px; display:block;">`;
    }
    if (m.text) {
        contentHtml += `<div>${m.text}</div>`;
    }
    
    b.innerHTML = `${contentHtml} <span class="message-time">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}</span>`;
    
    // Add click listener to image for lightbox
    const img = b.querySelector('img');
    if (img) {
        img.onclick = () => openLightbox(img.src);
    }
    
    container.appendChild(b);
    container.scrollTop = container.scrollHeight;
}
function handleInboxMessage(payload) {
    const roomId = getChatRoomId(currentUser.id, payload.senderId);
    
    // Handle Delete History Signal
    if (payload.type === "DELETE_HISTORY") {
        const friendRoomId = getChatRoomId(currentUser.id, payload.senderId);
        localStorage.removeItem(friendRoomId);
        // Clear last message in chat list too
        updateChatList(payload.senderId, payload.senderName, payload.senderAvatar, "Chat history cleared", payload.senderAvatarZoom, payload.senderAvatarX, payload.senderAvatarY);
        // If viewing this chat, re-render
        if (activeChatObj && activeChatObj.id === payload.senderId) {
            document.getElementById('active-chat-name').innerText = payload.senderName;
            const mini = document.getElementById('active-chat-avatar');
            mini.src = payload.senderAvatar;
            mini.style.transform = `scale(${payload.senderAvatarZoom || 1.7}) translate(${payload.senderAvatarX || 0}px, ${payload.senderAvatarY || 0}px)`;
            renderLocalMessages();
        }
        return;
    }

    // Save to device message history
    if (saveLocalMessage(roomId, payload)) {
        
        // WhatsApp Logic: Ensure this sender is in our Chat List Inbox
        const previewText = payload.image ? "📷 Photo" : payload.text;
        updateChatList(payload.senderId, payload.senderName, payload.senderAvatar, previewText, payload.senderAvatarZoom, payload.senderAvatarX, payload.senderAvatarY);
        
        // If we are currently actively looking at their chat, render the bubble
        if (activeChatObj && activeChatObj.id === payload.senderId) {
            // Update the live header name/avatar if they changed
            document.getElementById('active-chat-name').innerText = payload.senderName;
            const mini = document.getElementById('active-chat-avatar');
            mini.src = payload.senderAvatar;
            mini.style.transform = `scale(${payload.senderAvatarZoom || 1.7}) translate(${payload.senderAvatarX || 0}px, ${payload.senderAvatarY || 0}px)`;
            
            appendSingleMessageUI(payload);
        }
    }
}

DOM.backBtn.addEventListener('click', () => {
    if (activeChatObj && mqttClient) {
        const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
        const msgs = getLocalMessages();
        
        // Only trigger global delete if the OTHER person sent at least one message
        // (i.e., I am the recipient who has now 'viewed' their messages)
        const hasIncoming = msgs.some(m => m.senderId !== currentUser.id);
        
        if (hasIncoming) {
            localStorage.removeItem(roomId);
            
            const deleteSignal = {
                type: "DELETE_HISTORY",
                senderId: currentUser.id,
                senderName: currentUser.name,
                senderAvatar: currentUser.avatar,
                senderAvatarZoom: currentUser.avatarZoom || 1.7,
                senderAvatarX: currentUser.avatarX || 0,
                senderAvatarY: currentUser.avatarY || 0,
                timestamp: Date.now()
            };
            mqttClient.publish(`mchat/inbox/${activeChatObj.id}`, JSON.stringify(deleteSignal));
            updateChatList(activeChatObj.id, activeChatObj.name, activeChatObj.avatar, "Chat history cleared", activeChatObj.avatarZoom, activeChatObj.avatarX, activeChatObj.avatarY);
        }
    }
    DOM.chatView.classList.remove('open');
    activeChatObj = null;
});

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMessage();
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
    pendingImage = null;
    DOM.imagePreviewArea.style.display = "none";
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

if(DOM.settingsBtn) {
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
        
        // Remove self from global directory before disconnecting
        if(mqttClient && currentUser) {
            mqttClient.publish(`mchat/directory/${currentUser.id}`, "", { retain: true }); // delete retained message
        }

        // Clear everything
        currentUser = null;
        chatList = {};
        activeChatObj = null;
        generatedAvatarUrl = null;
        localStorage.clear(); 
        
        if (mqttClient) {
            mqttClient.end();
            mqttClient = null;
        }
        
        // Reset inputs
        DOM.nameInput.value = "";
        DOM.displayId.innerText = "0200000000";
        updateOnboardingAvatar('male'); // Reset to default male
        DOM.generateBtn.disabled = false;
        DOM.generateBtn.style.opacity = '1';
        DOM.statusMsg.innerText = '';
        
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
        const newAvatar = DOM.editAvatarPreviewImg.dataset.newUrl;
        if (newAvatar) {
            currentUser.avatar = newAvatar;
        }
        
        // Save adjustments
        currentUser.avatarZoom = currentZoom;
        currentUser.avatarX = currentX;
        currentUser.avatarY = currentY;
        
        // Save locally
        localStorage.setItem('mchat_currentUser', JSON.stringify(currentUser));
        
        // Update UI Header
        DOM.myNameDisplay.innerText = currentUser.name;
        DOM.myAvatar.src = currentUser.avatar;
        DOM.myAvatar.style.transform = `scale(${currentUser.avatarZoom}) translate(${currentUser.avatarX}px, ${currentUser.avatarY}px)`;
        
        // Republish to global directory with retain
        if (mqttClient) {
            const profileStr = JSON.stringify({
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                avatarZoom: currentUser.avatarZoom,
                avatarX: currentUser.avatarX,
                avatarY: currentUser.avatarY
            });
            mqttClient.publish(`mchat/directory/${currentUser.id}`, profileStr, { retain: true });
        }
        
        DOM.editProfileModal.style.display = 'none';
    });
}

// Let's go!
window.addEventListener('DOMContentLoaded', initApp);
