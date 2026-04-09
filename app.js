const DOM = {
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
    // Avatar creation elements
    createAvatarBtn: document.getElementById('create-avatar-btn'),
    cameraOverlay: document.getElementById('camera-overlay'),
    cameraVideo: document.getElementById('camera-video'),
    cameraCanvas: document.getElementById('camera-canvas'),
    cameraCaptureBtn: document.getElementById('camera-capture-btn'),
    cameraCloseBtn: document.getElementById('camera-close-btn'),
    avatarPreviewImg: document.getElementById('avatar-preview-img'),
    avatarPlaceholderIcon: document.getElementById('avatar-placeholder-icon'),
    avatarStatusText: document.getElementById('avatar-status-text'),
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
    editRetakeAvatarBtn: document.getElementById('edit-retake-avatar-btn'),
    editNameInput: document.getElementById('edit-name-input'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    saveEditBtn: document.getElementById('save-edit-btn')
};

let currentUser = null;
let mqttClient = null;
let activeChatObj = null;
let chatList = JSON.parse(localStorage.getItem('mchat_chatlist')) || {};
let generatedAvatarUrl = null; // Stores the Ready Player Me avatar URL
let isRetakingAvatar = false; // Checks if RPM is used for onboarding or edit profile

// --- Initialization ---

async function initApp() {
    console.log("Initializing M-Chat (Universal Inbox Architecture)...");
    
    // Minimum splash delay
    const splashDelay = new Promise(res => setTimeout(res, 2000));
    await splashDelay;
        
    const localData = localStorage.getItem('mchat_currentUser');
    
    if (localData) {
        // Auto-login
        currentUser = JSON.parse(localData);
        loadMainApp();
    } else {
        // New user
        showScreen('onboarding');
    }
}

// --- Screen Switching Logic ---

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    if (screenName === 'splash') DOM.splash.classList.add('active');
    if (screenName === 'onboarding') DOM.onboarding.classList.add('active');
    if (screenName === 'success') DOM.success.classList.add('active');
    if (screenName === 'app') DOM.app.classList.add('active');
}

// --- Native HTML5 Smart Canvas Avatar Integration ---
let cameraStream = null;

async function startCamera(isRetake = false) {
    isRetakingAvatar = isRetake;
    DOM.cameraOverlay.style.display = 'block';
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        DOM.cameraVideo.srcObject = cameraStream;
    } catch (err) {
        alert("Camera access is required to create your Avatar.");
        closeCamera();
    }
}

function closeCamera() {
    DOM.cameraOverlay.style.display = 'none';
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

DOM.createAvatarBtn.addEventListener('click', () => startCamera(false));
DOM.editRetakeAvatarBtn.addEventListener('click', () => startCamera(true));
DOM.cameraCloseBtn.addEventListener('click', closeCamera);

DOM.cameraCaptureBtn.addEventListener('click', () => {
    // Flash effect
    DOM.cameraCaptureBtn.style.transform = 'scale(0.8)';
    setTimeout(() => DOM.cameraCaptureBtn.style.transform = 'scale(1)', 150);

    // Setup Canvas
    const canvas = DOM.cameraCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;

    // Crop center square
    const videoSize = Math.min(DOM.cameraVideo.videoWidth, DOM.cameraVideo.videoHeight);
    const startX = (DOM.cameraVideo.videoWidth - videoSize) / 2;
    const startY = (DOM.cameraVideo.videoHeight - videoSize) / 2;

    // Flip horizontal to act like mirror
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // Filter to make it look like a Comic/Avatar
    // High contrast, saturate, and posterize-like feel
    ctx.filter = 'contrast(1.4) saturate(1.8) sepia(0.2)';

    // Draw frame to canvas
    ctx.drawImage(DOM.cameraVideo, startX, startY, videoSize, videoSize, 0, 0, 400, 400);

    // Reset filter
    ctx.filter = 'none';

    // Get Base64 URL
    const avatarDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    if (isRetakingAvatar) {
        DOM.editAvatarPreviewImg.src = avatarDataUrl;
        DOM.editAvatarPreviewImg.dataset.newUrl = avatarDataUrl;
    } else {
        generatedAvatarUrl = avatarDataUrl;
        
        DOM.avatarPlaceholderIcon.style.display = 'none';
        DOM.avatarPreviewImg.src = avatarDataUrl;
        DOM.avatarPreviewImg.style.display = 'block';

        DOM.generateBtn.disabled = false;
        DOM.generateBtn.style.opacity = '1';
        DOM.avatarStatusText.innerText = '✅ Avatar Filter applied! Now generate your account.';
        DOM.avatarStatusText.classList.add('success');
        DOM.createAvatarBtn.innerText = '✏️ Retake Selfie';
    }

    closeCamera();
});

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
            avatar: currentUser.avatar
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

function updateChatList(id, name, avatar, lastText) {
    if (!chatList[id]) {
        chatList[id] = { id, name, avatar, lastMessage: "", timestamp: Date.now() };
    }
    if (name) chatList[id].name = name;
    if (avatar) chatList[id].avatar = avatar;
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
        
        const timeStr = new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        div.innerHTML = `
            <div class="avatar-box">
                <img src="${c.avatar}" alt="${c.name}">
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
                updateChatList(profile.id, profile.name, profile.avatar, "");
                
                // Reset UI & Open Chat
                document.getElementById('new-chat-input').value = "";
                addBtn.innerText = "Start Chat";
                addBtn.disabled = false;
                
                openChatView(profile.name, profile.id, profile.avatar);
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

function openChatView(name, id, avatar) {
    activeChatObj = { id, name, avatar };
    document.getElementById('active-chat-name').innerText = name;
    document.getElementById('active-chat-avatar').src = avatar;
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
        b.innerHTML = `${m.text} <span class="message-time">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
        container.appendChild(b);
    });
    container.scrollTop = container.scrollHeight;
}

function appendSingleMessageUI(m) {
    const isSent = m.senderId === currentUser.id;
    const container = document.getElementById('message-container');
    const b = document.createElement('div');
    b.classList.add('message', isSent ? 'sent' : 'received', 'fade-in');
    b.innerHTML = `${m.text} <span class="message-time">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
    container.appendChild(b);
    container.scrollTop = container.scrollHeight;
}

function handleInboxMessage(payload) {
    const roomId = getChatRoomId(currentUser.id, payload.senderId);
    
    // Save to device message history
    if (saveLocalMessage(roomId, payload)) {
        
        // WhatsApp Logic: Ensure this sender is in our Chat List Inbox
        updateChatList(payload.senderId, payload.senderName, payload.senderAvatar, payload.text);
        
        // If we are currently actively looking at their chat, render the bubble
        if (activeChatObj && activeChatObj.id === payload.senderId) {
            appendSingleMessageUI(payload);
        }
    }
}

DOM.backBtn.addEventListener('click', () => {
    DOM.chatView.classList.remove('open');
    activeChatObj = null;
});

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if(!text || !activeChatObj || !mqttClient) return;
    input.value = ""; // Clear
    
    const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
    
    const msgPayload = {
        msgId: 'msg_' + Math.random().toString(36).substr(2, 9),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: text,
        timestamp: Date.now()
    };
    
    // Save my sent message locally immediately (optimistic UI)
    if (saveLocalMessage(roomId, msgPayload)) {
        appendSingleMessageUI(msgPayload);
        // Update my own chat list preview
        updateChatList(activeChatObj.id, activeChatObj.name, activeChatObj.avatar, text);
    }
    
    // Publish to FRIEND'S specific Inbox Topic!
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
        DOM.avatarPreviewImg.src = "";
        DOM.avatarPreviewImg.style.display = 'none';
        DOM.avatarPlaceholderIcon.style.display = 'inline';
        DOM.generateBtn.disabled = true;
        DOM.generateBtn.style.opacity = '0.4';
        DOM.generateBtn.innerText = "Generate Account";
        DOM.avatarStatusText.innerText = 'Avatar required to create account';
        DOM.avatarStatusText.classList.remove('success');
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
        
        // Save locally
        localStorage.setItem('mchat_currentUser', JSON.stringify(currentUser));
        
        // Update UI Header
        DOM.myNameDisplay.innerText = currentUser.name;
        DOM.myAvatar.src = currentUser.avatar;
        
        // Republish to global directory with retain
        if (mqttClient) {
            const profileStr = JSON.stringify({
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar
            });
            mqttClient.publish(`mchat/directory/${currentUser.id}`, profileStr, { retain: true });
        }
        
        DOM.editProfileModal.style.display = 'none';
    });
}

// Let's go!
window.addEventListener('DOMContentLoaded', initApp);
