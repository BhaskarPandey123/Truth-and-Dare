// 1. REPLACE THIS WITH YOUR CODESPACE URL
// Look at your browser URL. If it is https://abc-8000.app.github.dev
// Change it to wss://abc-8000.app.github.dev/ws/game
const WS_URL = "wss://YOUR-CODESPACE-URL-HERE.app.github.dev/ws/game"; 

let ws;
let currentPlayer = 1; // Keep track of whose turn it is

function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log("Connected to the game server!");
    };

    ws.onmessage = (event) => {
        // This runs when the OTHER player spins, OR when the server echoes your spin
        const data = JSON.parse(event.data);
        if (data.type === "spin") {
            animateSpin(data.result);
        }
    };

    ws.onclose = () => {
        console.log("Disconnected. Trying to reconnect...");
        setTimeout(connectWebSocket, 2000);
    };
}

// Spin button logic
document.getElementById('spinBtn').addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // Randomly pick Truth or Dare
        const result = Math.random() > 0.5 ? "TRUTH" : "DARE";
        
        // Send to server
        ws.send(JSON.stringify({ type: "spin", result: result }));
    }
});

function animateSpin(result) {
    const spinner = document.getElementById('spinner');
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('resultText');

    // Spin the bottle visually
    const randomDegrees = Math.floor(Math.random() * 360) + 720; // Spin at least twice
    spinner.style.transform = `rotate(${randomDegrees}deg)`;

    // Wait for CSS animation to finish, then show result
    setTimeout(() => {
        resultDiv.classList.remove('hidden');
        resultText.innerText = result;
    }, 2000); 
}

// Start connection
connectWebSocket();