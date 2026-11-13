// --- CONFIGURATION ---
const WS_URL = "wss://truth-and-dare-backend-gee9.onrender.com/ws/game"; 
const BACKEND_URL = "https://truth-and-dare-backend-gee9.onrender.com"; 
const ROOM_NAME = "truth-dare-room"; 

let ws;
let room;
let isVideoConnected = false;

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

// --- 1. WEBSOCKET GAME LOGIC ---
function connectWebSocket() {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log("Connected to game server!");
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "spin_result") {
            showPrompt(data.category, data.prompt, data.spinner);
        } 
        else if (data.type === "turn_complete") {
            resetGameUI();
        } 
        else if (data.type === "punishment_result") {
            showPunishment(data.punishment);
        }
    };
    
    ws.onclose = () => setTimeout(connectWebSocket, 2000);
}

// --- UI ELEMENTS ---
const spinnerArea = document.getElementById('spinnerArea');
const promptArea = document.getElementById('promptArea');
const actionArea = document.getElementById('actionArea');
const waitingForOpponent = document.getElementById('waitingForOpponent');
const spinBtn = document.getElementById('spinBtn');
const completeBtn = document.getElementById('completeBtn');
const punishBtn = document.getElementById('punishBtn');

// --- ACTIONS ---

// Spin Button
spinBtn.addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const isTruth = Math.random() > 0.5;
    const category = isTruth ? "TRUTH" : "DARE";
    const pool = isTruth ? truths : dares;
    const prompt = pool[Math.floor(Math.random() * pool.length)];

    // Send to server
    ws.send(JSON.stringify({ 
        type: "spin", 
        category: category, 
        prompt: prompt 
    }));

    // Lock our own UI
    spinnerArea.classList.add('hidden');
    promptArea.classList.remove('hidden');
    actionArea.classList.add('hidden');
    waitingForOpponent.classList.remove('hidden');
});

// Accept Completion (Opponent clicks this)
completeBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: "complete" }));
});

// Issue Punishment (Opponent clicks this)
punishBtn.addEventListener('click', () => {
    const punishment = punishments[Math.floor(Math.random() * punishments.length)];
    ws.send(JSON.stringify({ type: "punish", punishment: punishment }));
});

// --- UI HANDLERS ---
function showPrompt(category, prompt, spinner) {
    spinnerArea.classList.add('hidden');
    promptArea.classList.remove('hidden');
    
    document.getElementById('categoryText').innerText = category;
    document.getElementById('questionText').innerText = prompt;
    document.getElementById('turnIndicator').innerText = `${spinner}'s Turn`;

    // Are we the spinner, or the opponent?
    if (spinner === "Opponent") {
        // We are the opponent, we need to see the Done/Punish buttons
        actionArea.classList.remove('hidden');
        waitingForOpponent.classList.add('hidden');
    } else {
        // We are the spinner, we wait
        actionArea.classList.add('hidden');
        waitingForOpponent.classList.remove('hidden');
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
    spinBtn.innerText = "SPIN";
    
    // Reset color
    document.getElementById('categoryText').style.color = "#ff4757";
}

// --- 2. LIVEKIT VIDEO LOGIC ---
document.getElementById('joinCallBtn').addEventListener('click', async () => {
    const btn = document.getElementById('joinCallBtn');
    btn.innerText = "Connecting...";
    btn.disabled = true;

    // Randomly assign roles for the session (Player 1 or Player 2)
    const participantName = Math.random() > 0.5 ? "Player 1" : "Player 2";

    try {
        const response = await fetch(`${BACKEND_URL}/livekit-token?room_name=${ROOM_NAME}&participant_name=${participantName}`);
        const data = await response.json();
        
        room = new LivekitClient.Room();
        
        // Fix Audio: Explicitly force the audio element to play
        room.on('trackSubscribed', (track) => {
            if (track.kind === 'video') {
                track.attach(document.getElementById('remote-video'));
            }
            if (track.kind === 'audio') {
                const audioEl = track.attach();
                audioEl.autoplay = true;
                audioEl.controls = false;
                document.body.appendChild(audioEl); 
                audioEl.play().catch(e => console.log("Audio autoplay blocked:", e));
            }
        });

        room.on('localTrackPublished', (publication) => {
            if (publication.kind === 'video') {
                publication.track.attach(document.getElementById('local-video'));
            }
        });

        await room.connect(data.url, data.token);
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        btn.innerText = "Connected!";
        btn.style.backgroundColor = "#333";
        
        // Enable game since video is on
        isVideoConnected = true;
        spinBtn.disabled = false;
        document.getElementById('waitingText').classList.add('hidden');

    } catch (error) {
        console.error("Video Error:", error);
        btn.innerText = "Retry Video";
        btn.disabled = false;
    }
});

// --- THE GAME STATE IN WEBSOCKET ---
// We override the websocket onmessage to handle the server relay
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === "spin") {
        // Someone spun. 
        // If it wasn't us, it was the opponent.
        const isMe = (data.prompt === document.getElementById('questionText').innerText);
        
        // Update the spinner data from server
        animateSpin(data.category, data.prompt, isMe ? "Your" : "Opponent");
    } 
    else if (data.type === "complete") {
        resetGameUI();
    } 
    else if (data.type === "punish") {
        showPunishment(data.punishment);
        setTimeout(resetGameUI, 5000); // Reset after 5 seconds of showing punishment
    }
};

// Spin Animation function
function animateSpin(category, prompt, spinnerName) {
    const spinner = document.getElementById('spinner');
    spinner.style.transition = 'none';
    spinner.style.transform = 'rotate(0deg)';
    void spinner.offsetWidth; 
    
    spinner.style.transition = 'transform 2.5s cubic-bezier(0.25, 1, 0.5, 1)';
    const randomDegrees = Math.floor(Math.random() * 360) + 1080;
    spinner.style.transform = `rotate(${randomDegrees}deg)`;

    setTimeout(() => {
        showPrompt(category, prompt, spinnerName);
    }, 2500); 
}

// Start connection
connectWebSocket();