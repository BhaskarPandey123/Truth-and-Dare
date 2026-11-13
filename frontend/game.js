// --- CONFIGURATION ---
const WS_URL = "wss://truth-and-dare-backend-gee9.onrender.com/ws/game"; 
const BACKEND_URL = "https://truth-and-dare-backend-gee9.onrender.com"; 
const ROOM_NAME = "truth-dare-room"; 

// Generate a unique ID for this specific browser tab
const myId = "Player-" + Math.floor(Math.random() * 1000);

let ws;
let room;
let isCamOn = true;
let isMicOn = true;

// --- GAME DATA ---
const truths = [
    "What is your biggest fear?", 
    "What is the most embarrassing thing you've ever done?",
    "Who was your first crush?",
    "What is a secret you've never told anyone?",
    "What is your biggest insecurity?"
];
const dares = [
    "Do your best impression of a celebrity.",
    "Send a funny selfie to the last person you texted.",
    "Sing the chorus of your favorite song out loud.",
    "Do 10 pushups right now.",
    "Speak in an accent until your next turn."
];
const punishments = [
    "You have to compliment the other player for 1 minute straight.",
    "You owe the other player a coffee next time you meet.",
    "You must do a silly dance for 15 seconds.",
    "You have to let the other player change your phone wallpaper.",
    "You cannot speak for the next 2 rounds."
];

// --- UI ELEMENTS ---
const spinnerArea = document.getElementById('spinnerArea');
const promptArea = document.getElementById('promptArea');
const actionArea = document.getElementById('actionArea');
const waitingForOpponent = document.getElementById('waitingForOpponent');
const spinBtn = document.getElementById('spinBtn');
const completeBtn = document.getElementById('completeBtn');
const punishBtn = document.getElementById('punishBtn');

// --- 1. WEBSOCKET GAME LOGIC ---
function connectWebSocket() {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log("Connected to game server!");
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Check if the message came from US or the OPPONENT
        const isMe = (data.senderId === myId);
        
        if (data.type === "spin") {
            animateSpin(data.category, data.prompt, isMe);
        } 
        else if (data.type === "complete") {
            resetGameUI();
        } 
        else if (data.type === "punish") {
            showPunishment(data.punishment);
            setTimeout(resetGameUI, 5000); 
        }
    };
    ws.onclose = () => setTimeout(connectWebSocket, 2000);
}

// Spin Button
spinBtn.addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const isTruth = Math.random() > 0.5;
    const category = isTruth ? "TRUTH" : "DARE";
    const pool = isTruth ? truths : dares;
    const prompt = pool[Math.floor(Math.random() * pool.length)];

    // Send to server with our unique ID
    ws.send(JSON.stringify({ 
        type: "spin", 
        senderId: myId,
        category: category, 
        prompt: prompt 
    }));
});

// Accept Completion
completeBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: "complete" }));
});

// Issue Punishment
punishBtn.addEventListener('click', () => {
    const punishment = punishments[Math.floor(Math.random() * punishments.length)];
    ws.send(JSON.stringify({ type: "punish", punishment: punishment }));
});

// --- UI HANDLERS ---
function animateSpin(category, prompt, isMe) {
    spinnerArea.classList.remove('hidden');
    promptArea.classList.add('hidden');
    
    const spinner = document.getElementById('spinner');
    spinner.style.transition = 'none';
    spinner.style.transform = 'rotate(0deg)';
    void spinner.offsetWidth; 
    
    spinner.style.transition = 'transform 2.5s cubic-bezier(0.25, 1, 0.5, 1)';
    const randomDegrees = Math.floor(Math.random() * 360) + 1080;
    spinner.style.transform = `rotate(${randomDegrees}deg)`;

    setTimeout(() => {
        showPrompt(category, prompt, isMe);
    }, 2500); 
}

function showPrompt(category, prompt, isMe) {
    spinnerArea.classList.add('hidden');
    promptArea.classList.remove('hidden');
    
    document.getElementById('categoryText').innerText = category;
    document.getElementById('questionText').innerText = prompt;
    document.getElementById('turnIndicator').innerText = isMe ? "YOUR TURN" : "OPPONENT'S TURN";

    if (isMe) {
        // I spun. I wait for them.
        actionArea.classList.add('hidden');
        waitingForOpponent.classList.remove('hidden');
    } else {
        // They spun. I get the buttons.
        actionArea.classList.remove('hidden');
        waitingForOpponent.classList.add('hidden');
    }
}

function showPunishment(punishment) {
    document.getElementById('categoryText').innerText = "PUNISHMENT";
    document.getElementById('categoryText').style.color = "#ff9f43";
    document.getElementById('questionText').innerText = punishment;
    document.getElementById('turnIndicator').innerText = "Punishment Issued!";
    actionArea.classList.add('hidden');
    waitingForOpponent.classList.add('hidden');
}

function resetGameUI() {
    spinnerArea.classList.remove('hidden');
    promptArea.classList.add('hidden');
    actionArea.classList.add('hidden');
    waitingForOpponent.classList.add('hidden');
    spinBtn.disabled = false;
    
    // Reset colors
    document.getElementById('categoryText').style.color = "#ff4757";
    document.getElementById('spinner').style.transform = 'rotate(0deg)';
}


// --- 2. LIVEKIT VIDEO LOGIC ---
document.getElementById('joinCallBtn').addEventListener('click', async () => {
    const btn = document.getElementById('joinCallBtn');
    btn.innerText = "Connecting...";
    btn.disabled = true;

    try {
        const response = await fetch(`${BACKEND_URL}/livekit-token?room_name=${ROOM_NAME}&participant_name=${myId}`);
        const data = await response.json();
        
        room = new LivekitClient.Room();
        
        // Handle Remote Video & Audio
        room.on('trackSubscribed', (track) => {
            if (track.kind === 'video') {
                track.attach(document.getElementById('remote-video'));
            }
            if (track.kind === 'audio') {
                const audioEl = track.attach();
                audioEl.autoplay = true;
                document.body.appendChild(audioEl); 
                audioEl.play().catch(e => console.log("Audio blocked:", e));
            }
        });

        // Handle Local Video
        room.on('localTrackPublished', (publication) => {
            if (publication.kind === 'video') {
                const localVideo = document.getElementById('local-video');
                localVideo.innerHTML = ''; 
                publication.track.attach(localVideo);
            }
        });

        await room.connect(data.url, data.token);
        
        // Turn on initial tracks
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        // UI Updates
        btn.classList.add('hidden');
        document.getElementById('toggleCamBtn').classList.remove('hidden');
        document.getElementById('toggleMicBtn').classList.remove('hidden');
        
        spinBtn.disabled = false;
        document.getElementById('waitingText').classList.add('hidden');

    } catch (error) {
        console.error("Video Error:", error);
        btn.innerText = "Retry Video";
        btn.disabled = false;
    }
});

// --- 3. TOGGLE CAMERA & MIC LOGIC ---
document.getElementById('toggleCamBtn').addEventListener('click', async (e) => {
    if (!room) return;
    isCamOn = !isCamOn;
    await room.localParticipant.setCameraEnabled(isCamOn);
    
    // Update Button UI
    e.target.innerText = isCamOn ? "📷 Cam On" : "📷 Cam Off";
    e.target.classList.toggle('off', !isCamOn);
    
    // Show/Hide placeholder
    document.getElementById('local-placeholder').classList.toggle('hidden', isCamOn);
});

document.getElementById('toggleMicBtn').addEventListener('click', async (e) => {
    if (!room) return;
    isMicOn = !isMicOn;
    await room.localParticipant.setMicrophoneEnabled(isMicOn);
    
    // Update Button UI
    e.target.innerText = isMicOn ? "🎤 Mic On" : "🎤 Mic Off";
    e.target.classList.toggle('off', !isMicOn);
});

// Start the connection
connectWebSocket();