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

let currentUser = null;
let mqttClient = null;
let activeChatObj = null;

// --- Initialization ---

async function initApp() {
    console.log("Initializing M-Chat with MQTT Engine...");
    
    // Minimum splash screen duration for premium feel
    const splashDelay = new Promise(res => setTimeout(res, 2000));
    await splashDelay;
        
    const localData = localStorage.getItem('mchat_currentUser');
    
    if (localData) {
        // Auto-login from local device storage!
        console.log("Account recovered from local storage.");
        currentUser = JSON.parse(localData);
        loadMainApp();
    } else {
        // New device / No account
        console.log("No account found. Prompting onboarding.");
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

// --- Account Generation Logic (Without Puter) ---

DOM.generateBtn.addEventListener('click', async () => {
    const name = DOM.nameInput.value.trim();
    if (!name) {
        DOM.statusMsg.innerText = "Please enter your name first.";
        return;
    }

    DOM.generateBtn.disabled = true;
    DOM.generateBtn.innerText = "Generating...";
    DOM.statusMsg.innerText = "Generating secure offline ID...";

    // Generate a pseudo-random 6-digit number and prepend 0200
    const random6 = Math.floor(100000 + Math.random() * 900000);
    const uniqueIdString = "0200" + random6.toString();
    
    currentUser = {
        id: uniqueIdString,
        name: name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        createdAt: new Date().toISOString()
    };

    // Save strictly to local device. No logins needed.
    localStorage.setItem('mchat_currentUser', JSON.stringify(currentUser));
    
    // Show Success
    DOM.displayId.innerText = uniqueIdString;
    showScreen('success');
});

DOM.startChatBtn.addEventListener('click', () => {
    loadMainApp();
});


// --- Main App & MQTT Logic ---

function loadMainApp() {
    if (!currentUser) return;

    // Populate header
    DOM.myNameDisplay.innerText = currentUser.name;
    DOM.myIdDisplay.innerText = "ID: " + currentUser.id;
    DOM.myAvatar.src = currentUser.avatar;

    showScreen('app');
    
    // Initialize MQTT WebSockets connection
    initMQTT();
    
    // Load friend list
    loadDummyChats();
}

function initMQTT() {
    // Connect to free public EMQX broker
    const clientId = 'mchat_client_' + currentUser.id + '_' + Math.random().toString(16).substr(2, 8);
    const host = 'wss://broker.emqx.io:8084/mqtt';
    
    console.log("Connecting to MQTT broker...");
    mqttClient = mqtt.connect(host, {
        clientId: clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 2000,
    });

    mqttClient.on('connect', () => {
        console.log('Connected to MQTT Broker.');
        // Subscribe to a personal inbox channel just in case
        mqttClient.subscribe(`mchat_inbox_${currentUser.id}`);
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            handleIncomingMessage(topic, payload);
        } catch (e) {
            console.error("Failed to parse message:", e);
        }
    });
}

function getChatRoomId(id1, id2) {
    return "mchat_room_" + [id1, id2].sort().join('_');
}

function loadDummyChats() {
    document.getElementById('add-friend-btn').addEventListener('click', startNewChat);
}

function startNewChat() {
    const friendId = document.getElementById('new-chat-input').value.trim();
    if(friendId.length < 5 || friendId === currentUser.id) return alert("Invalid ID");
    
    document.getElementById('new-chat-input').value = ""; // Clear
    openChatView("Friend " + friendId, friendId, `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendId}`);
}

// --- Chat View Utilities ---

function openChatView(name, id, avatar) {
    activeChatObj = { id, name, avatar };
    document.getElementById('active-chat-name').innerText = name;
    document.getElementById('active-chat-avatar').src = avatar;
    DOM.chatView.classList.add('open');
    
    const roomId = getChatRoomId(currentUser.id, id);
    
    // Subscribe to this room's real-time events channel
    if (mqttClient) {
        mqttClient.subscribe(roomId);
    }
    
    // Render existing local messages for this room
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
    // Only save if it's distinct to prevent dupes
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
        const isSent = m.sender === currentUser.id;
        const b = document.createElement('div');
        b.classList.add('message', isSent ? 'sent' : 'received');
        b.innerHTML = `${m.text} <span class="message-time">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
        container.appendChild(b);
    });
    container.scrollTop = container.scrollHeight;
}

function appendSingleMessageUI(m) {
    const isSent = m.sender === currentUser.id;
    const container = document.getElementById('message-container');
    const b = document.createElement('div');
    b.classList.add('message', isSent ? 'sent' : 'received', 'fade-in');
    b.innerHTML = `${m.text} <span class="message-time">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
    container.appendChild(b);
    container.scrollTop = container.scrollHeight;
}

function handleIncomingMessage(topic, payload) {
    if (activeChatObj) {
        const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
        if (topic === roomId) {
            // Save and render it
            if (saveLocalMessage(roomId, payload)) {
                appendSingleMessageUI(payload);
            }
        }
    }
}

DOM.backBtn.addEventListener('click', () => {
    DOM.chatView.classList.remove('open');
    if (mqttClient && activeChatObj) {
        const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
        mqttClient.unsubscribe(roomId);
    }
    activeChatObj = null;
});

// --- Sending messages ---

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if(!text || !activeChatObj || !mqttClient) return;
    input.value = ""; // Clear early
    
    const roomId = getChatRoomId(currentUser.id, activeChatObj.id);
    
    const msgPayload = {
        msgId: 'msg_' + Math.random().toString(36).substr(2, 9),
        sender: currentUser.id,
        text: text,
        timestamp: Date.now()
    };
    
    // Save locally and render instantly (optimistic UI)
    if (saveLocalMessage(roomId, msgPayload)) {
        appendSingleMessageUI(msgPayload);
    }
    
    // Broadcast to the other person instantly via MQTT WebSockets
    mqttClient.publish(roomId, JSON.stringify(msgPayload), { qos: 1 });
}

// Start the app sequence
window.addEventListener('DOMContentLoaded', initApp);
