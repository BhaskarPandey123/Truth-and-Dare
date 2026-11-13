// If Railway is done, paste your Railway URL here (start with wss://)
// Otherwise, keep your Codespace URL: wss://your-codespace-8000.app.github.dev/ws/game
const WS_URL = "const WS_URL = "wss://truth-and-dare-xyz.onrender.com/ws/game"; "; 

let ws;

// Handle UI Theme Switching
const themeSelector = document.getElementById('themeSelector');
const spinner = document.getElementById('spinner');

themeSelector.addEventListener('change', (e) => {
    const theme = e.target.value;
    if (theme === 'bottle') spinner.innerText = '🍾';
    if (theme === 'needle') spinner.innerText = '🪡';
    if (theme === 'knife') spinner.innerText = '🔪';
    if (theme === 'cola') spinner.innerText = '🥤';
});

// WebSocket Connection
function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("Connected to the game server!");
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

// Spin Action
document.getElementById('spinBtn').addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const result = Math.random() > 0.5 ? "TRUTH" : "DARE";
        ws.send(JSON.stringify({ type: "spin", result: result }));
    } else {
        alert("Not connected to server yet!");
    }
});

// Animation
function animateSpin(result) {
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('resultText');

    // Reset rotation, then force a reflow to restart animation
    spinner.style.transition = 'none';
    spinner.style.transform = 'rotate(0deg)';
    void spinner.offsetWidth; 
    
    spinner.style.transition = 'transform 2.5s cubic-bezier(0.25, 1, 0.5, 1)';
    const randomDegrees = Math.floor(Math.random() * 360) + 1080; // 3 full spins
    spinner.style.transform = `rotate(${randomDegrees}deg)`;

    resultDiv.classList.add('hidden'); // Hide previous result

    setTimeout(() => {
        resultDiv.classList.remove('hidden');
        resultText.innerText = result;
    }, 2500); 
}

connectWebSocket();