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
    // Avatar Customizer elements
    createAvatarBtn: document.getElementById('create-avatar-btn'),
    avatarEditorOverlay: document.getElementById('avatar-editor-overlay'),
    editorPreviewImg: document.getElementById('editor-preview-img'),
    editorCloseBtn: document.getElementById('editor-close-btn'),
    saveAvatarBtn: document.getElementById('save-avatar-btn'),
    choicesGrid: document.getElementById('choices-grid'),
    categoryTabs: document.getElementById('category-tabs'),
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

// --- M-Chat Premium Character Creator (Bitmoji Style) ---

const AVATAR_OPTIONS = {
    maleTop: ["shortHair", "frizzle", "shaggy", "turban", "winterHat01", "dreads", "fro", "theCaesar", "shortCurly", "shortFlat", "shortRound", "shortWaved", "sides", "theCaesarAndSidePart"],
    femaleTop: ["longHair", "bob", "curly", "frida", "fro", "shaggy", "turban", "longHairCurly", "longHairStraight", "bigHair", "bun", "curvy", "miaWallace", "notTooLong", "straight01", "straight02"],
    hairColor: ["2c1b18", "4a312c", "724133", "a55728", "b58143", "d6b370", "724133", "4a312c"],
    skinColor: ["624133", "8d5524", "c68642", "e0ac69", "f1c27d", "ffdbac", "edb98a"],
    clothing: ["blazerAndShirt", "blazerAndSweater", "collarAndSweater", "graphicShirt", "hoodie", "overall", "shirtCrewNeck", "shirtScoopNeck", "shirtVNeck"],
    accessories: ["none", "kurt", "prescription01", "prescription02", "round", "sunglasses", "wayfarers"],
    beards: ["none", "beardMedium", "beardLight", "beardMajestic", "beardSmall", "beardThick"],
    moustaches: ["none", "moustachFancy", "moustacheMagnum", "moustacheSmall", "moustacheThin"],
    mouth: ["smile", "serious", "grimace", "default", "eating", "twinkle", "concerned", "disbelief", "sad", "tongue"]
};

let currentAvatarState = {
    gender: "male",
    top: 0,
    hairColor: 0,
    skinColor: 4, 
    clothing: 1,
    accessories: 0,
    facialHair: "none", 
    mouth: 0
};

let currentCategory = "top";

function generateAvatarUrl(customState = null) {
    const s = customState || currentAvatarState;
    const baseUrl = "https://api.dicebear.com/7.x/avataaars/svg";
    
    // Choose pool based on gender
    const topVal = s.gender === "male" ? AVATAR_OPTIONS.maleTop[s.top] : AVATAR_OPTIONS.femaleTop[s.top];
    const facialHairVal = s.gender === "male" ? s.facialHair : "none";

    const params = new URLSearchParams({
        top: topVal,
        hairColor: AVATAR_OPTIONS.hairColor[s.hairColor],
        skinColor: AVATAR_OPTIONS.skinColor[s.skinColor],
        clothing: AVATAR_OPTIONS.clothing[s.clothing],
        accessories: (AVATAR_OPTIONS.accessories[s.accessories] === "none" ? "" : AVATAR_OPTIONS.accessories[s.accessories]),
        facialHair: (facialHairVal === "none" ? "" : facialHairVal),
        mouth: AVATAR_OPTIONS.mouth[s.mouth],
        backgroundColor: "b6e3f4"
    });
    return `${baseUrl}?${params.toString()}`;
}

function updateEditorPreview() {
    DOM.editorPreviewImg.src = generateAvatarUrl();
}

function renderChoicesGrid() {
    const grid = DOM.choicesGrid;
    grid.innerHTML = ""; // Clear
    
    let pool = [];
    let stateKey = currentCategory;

    if (currentCategory === "top") {
        pool = currentAvatarState.gender === "male" ? AVATAR_OPTIONS.maleTop : AVATAR_OPTIONS.femaleTop;
    } else if ((currentCategory === "beards" || currentCategory === "moustaches") && currentAvatarState.gender === "female") {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:gray; font-size:0.8rem;'>Not available for female</p>";
        return;
    } else {
        pool = AVATAR_OPTIONS[currentCategory];
    }

    pool.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        
        // Active check
        const isActive = (currentCategory === "beards" || currentCategory === "moustaches") 
                         ? currentAvatarState.facialHair === item 
                         : currentAvatarState[currentCategory] === index;

        itemDiv.className = `choice-item ${isActive ? 'active' : ''}`;
        
        // Thumbnail URL
        const thumbState = { ...currentAvatarState };
        if (currentCategory === "beards" || currentCategory === "moustaches") {
            thumbState.facialHair = item;
        } else {
            thumbState[currentCategory] = index;
        }
        
        const thumbUrl = generateAvatarUrl(thumbState);
        itemDiv.innerHTML = `<img src="${thumbUrl}" loading="lazy">`;
        
        itemDiv.onclick = () => {
            if (currentCategory === "beards" || currentCategory === "moustaches") {
                currentAvatarState.facialHair = item;
            } else {
                currentAvatarState[currentCategory] = index;
            }
            updateEditorPreview();
            renderChoicesGrid();
        };
        grid.appendChild(itemDiv);
    });
}

// Open Editor
DOM.createAvatarBtn.addEventListener('click', () => {
    isRetakingAvatar = false;
    DOM.avatarEditorOverlay.style.display = 'block';
    renderChoicesGrid();
    updateEditorPreview();
});

DOM.editRetakeAvatarBtn.addEventListener('click', () => {
    isRetakingAvatar = true;
    DOM.avatarEditorOverlay.style.display = 'block';
    renderChoicesGrid();
    updateEditorPreview();
});

DOM.editorCloseBtn.addEventListener('click', () => {
    DOM.avatarEditorOverlay.style.display = 'none';
});

// Category Tabs Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        renderChoicesGrid();
    });
});

// Gender Toggle Logic
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const gender = btn.dataset.gender;
        currentAvatarState.gender = gender;
        currentAvatarState.top = 0; // Reset hair to avoid index mismatch
        
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Hide/Show Beard & Moustache tabs for Female
        document.querySelectorAll('.tab-btn[data-cat="beards"], .tab-btn[data-cat="moustaches"]').forEach(tab => {
            tab.style.display = gender === 'female' ? 'none' : 'inline-block';
        });

        // If one of the hidden tabs was active, switch to Hairstyle
        if (gender === 'female' && (currentCategory === 'beards' || currentCategory === 'moustaches')) {
            currentCategory = "top";
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.tab-btn[data-cat="top"]').classList.add('active');
        }

        updateEditorPreview();
        renderChoicesGrid();
    });
});

// Save Logic
DOM.saveAvatarBtn.addEventListener('click', () => {
    const finalUrl = generateAvatarUrl();
    
    if (isRetakingAvatar) {
        DOM.editAvatarPreviewImg.src = finalUrl;
        DOM.editAvatarPreviewImg.dataset.newUrl = finalUrl;
    } else {
        generatedAvatarUrl = finalUrl;
        
        DOM.avatarPlaceholderIcon.style.display = 'none';
        DOM.avatarPreviewImg.src = finalUrl;
        DOM.avatarPreviewImg.style.display = 'block';

        DOM.generateBtn.disabled = false;
        DOM.generateBtn.style.opacity = '1';
        DOM.avatarStatusText.innerText = '✅ Avatar saved! Looking great.';
        DOM.avatarStatusText.classList.add('success');
        DOM.createAvatarBtn.innerText = '✏️ Edit Avatar';
    }
    
    DOM.avatarEditorOverlay.style.display = 'none';
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
