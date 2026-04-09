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
    chatItemsList: document.getElementById('chat-items-list')
};

// --- Initialization & Device Fingerprint ---

// In a real Capacitor app, we would use: 
// import { Device } from '@capacitor/device';
// const info = await Device.getId(); 
// let deviceId = info.identifier;

// For this web-based prototype, we emulate a persistent device ID using localStorage.
// If packaged as an APK, this would connect to the actual Android Hardware ID.
function getHardwareId() {
    let hwId = localStorage.getItem('mchat_hardware_uuid');
    if (!hwId) {
        hwId = 'HW-' + Math.random().toString(36).substr(2, 16);
        localStorage.setItem('mchat_hardware_uuid', hwId);
    }
    return hwId;
}

let currentUser = null;

async function initApp() {
    console.log("Initializing M-Chat...");
    
    // Minimum splash screen duration for premium feel
    const splashDelay = new Promise(res => setTimeout(res, 2000));
    
    try {
        const hardwareId = getHardwareId();
        
        // 1. Check Puter Cloud for an existing account linked to this device
        // We use a specific key pattern: device_account_<hardwareId>
        const existingData = await puter.kv.get(`device_account_${hardwareId}`);
        
        await splashDelay;

        if (existingData) {
            // Auto-login! Found existing account on this device.
            console.log("Account recovered for device:", hardwareId);
            currentUser = typeof existingData === 'string' ? JSON.parse(existingData) : existingData;
            loadMainApp();
        } else {
            // New device / No account
            console.log("No account found. Prompting onboarding.");
            showScreen('onboarding');
        }

    } catch (error) {
        console.error("Initialization error:", error);
        await splashDelay;
        DOM.statusMsg.innerText = "Error connecting to servers.";
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

// --- Account Generation Logic ---

DOM.generateBtn.addEventListener('click', async () => {
    const name = DOM.nameInput.value.trim();
    if (!name) {
        DOM.statusMsg.innerText = "Please enter your name first.";
        return;
    }

    DOM.generateBtn.disabled = true;
    DOM.generateBtn.innerText = "Generating...";
    DOM.statusMsg.innerText = "Connecting to M-Chat secure servers...";

    try {
        // Atomic increment from Puter.js to get a unique sequential number
        // Starts at 0 natively, so we add it to 200000000
        const counter = await puter.kv.incr('mchat_global_user_counter');
        
        // Format logic: 0200 + 6 digit counter (pad with zeros)
        // E.g., counter 1 => 0200000001
        const uniqueIdString = "0200" + counter.toString().padStart(6, '0');
        
        const hardwareId = getHardwareId();
        
        currentUser = {
            id: uniqueIdString,
            name: name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            createdAt: new Date().toISOString(),
            deviceId: hardwareId
        };

        // Save to Puter Cloud linked to this specific device
        await puter.kv.set(`device_account_${hardwareId}`, JSON.stringify(currentUser));
        
        // Also add to a global directory of all users (for searching later)
        await puter.kv.set(`user_profile_${uniqueIdString}`, JSON.stringify({
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar
        }));

        // Show Success
        DOM.displayId.innerText = uniqueIdString;
        showScreen('success');

    } catch (err) {
        console.error("Failed to generate account:", err);
        DOM.statusMsg.innerText = "Generation failed. Try again.";
        DOM.generateBtn.disabled = false;
        DOM.generateBtn.innerText = "Generate Account";
    }
});

DOM.startChatBtn.addEventListener('click', () => {
    loadMainApp();
});

let activeChatObj = null;
let chatPollingTimer = null;
let currentMessageCount = 0;


// --- Main App Logic ---

function loadMainApp() {
    if (!currentUser) return;

    // Populate header
    DOM.myNameDisplay.innerText = currentUser.name;
    DOM.myIdDisplay.innerText = "ID: " + currentUser.id;
    DOM.myAvatar.src = currentUser.avatar;

    showScreen('app');
    loadDummyChats();
}

// --- Real-time Chat Logic ---
function loadDummyChats() {
    // Bind Add Friend Button
    document.getElementById('add-friend-btn').addEventListener('click', startNewChat);
}

async function startNewChat() {
    const friendId = document.getElementById('new-chat-input').value.trim();
    if(friendId.length < 5 || friendId === currentUser.id) return alert("Invalid ID");
    
    // Check if user exists
    const friendProfile = await puter.kv.get(`user_profile_${friendId}`);
    if(!friendProfile) return alert("User not found!");
    
    const friend = typeof friendProfile === 'string' ? JSON.parse(friendProfile) : friendProfile;
    document.getElementById('new-chat-input').value = ""; // Clear
    openChatView(friend.name, friend.id, friend.avatar);
}

function getChatRoomId(id1, id2) {
    return "chat_" + [id1, id2].sort().join('_');
}

// --- Chat View Utilities ---

function openChatView(name, id, avatar) {
    activeChatObj = { id, name, avatar };
    document.getElementById('active-chat-name').innerText = name;
    document.getElementById('active-chat-avatar').src = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=system&backgroundColor=4fb087`;
    DOM.chatView.classList.add('open');
    
    // Setup message container and Start Polling
    document.getElementById('message-container').innerHTML = "";
    currentMessageCount = 0;
    pollMessages();
    chatPollingTimer = setInterval(pollMessages, 2000);
}

async function pollMessages() {
    if(!activeChatObj || !currentUser) return;
    const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
    let msgsData = await puter.kv.get(roomId);
    let msgsStr = typeof msgsData === 'string' ? msgsData : JSON.stringify(msgsData || "[]");
    let msgs = msgsData ? JSON.parse(msgsStr) : [];
    
    if(msgs.length > currentMessageCount) {
        const newMsgs = msgs.slice(currentMessageCount);
        const container = document.getElementById('message-container');
        
        newMsgs.forEach(m => {
            const isSent = m.sender === currentUser.id;
            const b = document.createElement('div');
            b.classList.add('message', isSent ? 'sent' : 'received');
            b.innerHTML = `${m.text} <span class="message-time">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
            container.appendChild(b);
        });
        currentMessageCount = msgs.length;
        container.scrollTop = container.scrollHeight;
    }
}

DOM.backBtn.addEventListener('click', () => {
    DOM.chatView.classList.remove('open');
    clearInterval(chatPollingTimer);
    activeChatObj = null;
});

// --- Sending messages ---
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if(!text || !activeChatObj) return;
    input.value = ""; // Clear early
    
    const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
    let msgsData = await puter.kv.get(roomId);
    let msgsStr = typeof msgsData === 'string' ? msgsData : JSON.stringify(msgsData || "[]");
    let msgs = msgsData ? JSON.parse(msgsStr) : [];
    
    msgs.push({
        sender: currentUser.id,
        text: text,
        timestamp: Date.now()
    });
    
    await puter.kv.set(roomId, JSON.stringify(msgs));
    pollMessages(); // Force immediate update
}

// Start the app sequence
window.addEventListener('DOMContentLoaded', initApp);
