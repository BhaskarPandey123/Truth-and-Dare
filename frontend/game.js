// --- CONFIGURATION ---
const WS_URL = "wss://truth-and-dare-backend-gee9.onrender.com/ws/game"; 
const BACKEND_URL = "https://truth-and-dare-backend-gee9.onrender.com"; 
const ROOM_NAME = "truth-dare-room"; 

let ws;
let room;

// --- 1. GAME WEBSOCKET LOGIC ---
function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("Connected to game server!");
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "spin") {
            animateSpin(data.result);
        }
    };
    ws.onclose = () => {
        console.log("Disconnected. Reconnecting...");
        setTimeout(connectWebSocket, 2000);
    };
}

document.getElementById('spinBtn').addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const result = Math.random() > 0.5 ? "TRUTH" : "DARE";
        ws.send(JSON.stringify({ type: "spin", result: result }));
    } else {
        alert("Not connected to game server yet!");
    }
});

// Theme Switcher
const themeSelector = document.getElementById('themeSelector');
const spinner = document.getElementById('spinner');

themeSelector.addEventListener('change', (e) => {
    const theme = e.target.value;
    if (theme === 'bottle') spinner.innerText = '🍾';
    if (theme === 'needle') spinner.innerText = '🪡';
    if (theme === 'knife') spinner.innerText = '🔪';
    if (theme === 'cola') spinner.innerText = '🥤';
});

// Spin Animation
function animateSpin(result) {
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('resultText');

    spinner.style.transition = 'none';
    spinner.style.transform = 'rotate(0deg)';
    void spinner.offsetWidth; 
    
    spinner.style.transition = 'transform 2.5s cubic-bezier(0.25, 1, 0.5, 1)';
    const randomDegrees = Math.floor(Math.random() * 360) + 1080;
    spinner.style.transform = `rotate(${randomDegrees}deg)`;

    resultDiv.classList.add('hidden');

    setTimeout(() => {
        resultDiv.classList.remove('hidden');
        resultText.innerText = result;
    }, 2500); 
}


// --- 2. LIVEKIT VIDEO LOGIC ---
// --- 2. LIVEKIT VIDEO LOGIC ---
document.getElementById('joinCallBtn').addEventListener('click', async () => {
    const btn = document.getElementById('joinCallBtn');
    btn.innerText = "Connecting...";
    btn.disabled = true;

    const participantName = "Player-" + Math.floor(Math.random() * 1000);

    try {
        // Fetch token from Render
        const response = await fetch(`${BACKEND_URL}/livekit-token?room_name=${ROOM_NAME}&participant_name=${participantName}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error("Failed to get token");

        // Connect to LiveKit Room
        room = new LivekitClient.Room();
        
        // 1. Listen for the REMOTE player's video
        room.on('trackSubscribed', (track) => {
            if (track.kind === 'video') {
                track.attach(document.getElementById('remote-video'));
            }
            if (track.kind === 'audio') {
                const audioEl = track.attach();
                document.body.appendChild(audioEl); 
            }
        });

        // 2. Listen for YOUR OWN video (This fixes the crash and the left box!)
        room.on('localTrackPublished', (publication) => {
            if (publication.kind === 'video') {
                publication.track.attach(document.getElementById('local-video'));
            }
        });

        // Connect to the room
        await room.connect(data.url, data.token);
        
        // Turn on Camera and Mic (This triggers the localTrackPublished event above)
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        btn.innerText = "Connected!";
        btn.style.backgroundColor = "#333";

    } catch (error) {
        console.error("Video Error:", error);
        btn.innerText = "Retry Video";
        btn.disabled = false;
        alert("Could not connect to video. Check console for details.");
    }
});
// Start the game connection
connectWebSocket();