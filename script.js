// Socket.IO connection
const socket = io();

// Game state
let currentPlayer = {
    id: '',
    name: '',
    isHost: false
};

let currentGame = null;
let players = [];
let gameState = {};

// Elements
const screens = {
    home: document.getElementById('homeScreen'),
    lobby: document.getElementById('lobbyScreen'),
    quickDraw: document.getElementById('quickDrawScreen'),
    trivia: document.getElementById('triviaScreen'),
    spy: document.getElementById('spyScreen')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupSocketListeners();
});

// Event Listeners
function setupEventListeners() {
    // Join game
    document.getElementById('joinBtn').addEventListener('click', joinGame);
    document.getElementById('playerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });

    // Lobby
    document.getElementById('leaveBtn').addEventListener('click', leaveGame);
    document.getElementById('startGameBtn').addEventListener('click', startSelectedGame);

    // Game selection
    document.querySelectorAll('.game-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.game-select-btn').forEach(b => b.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            currentGame = e.currentTarget.dataset.game;
            updateStartButton();
        });
    });

    // Quick Draw
    setupCanvas();
    document.getElementById('sendGuess').addEventListener('click', sendGuess);
    document.getElementById('guessInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendGuess();
    });
    document.getElementById('clearCanvas').addEventListener('click', clearCanvas);
    document.getElementById('leaveGameBtn').addEventListener('click', () => {
        socket.emit('leaveGame');
        showScreen('lobby');
    });

    // Trivia
    document.getElementById('leaveTriviaBtn').addEventListener('click', () => {
        socket.emit('leaveGame');
        showScreen('lobby');
    });

    // Spy Hunt
    document.getElementById('sendSpyChat').addEventListener('click', sendSpyChat);
    document.getElementById('spyChatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendSpyChat();
    });
    document.getElementById('leaveSpyBtn').addEventListener('click', () => {
        socket.emit('leaveGame');
        showScreen('lobby');
    });
}

// Socket Listeners
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('playerJoined', (data) => {
        currentPlayer.id = data.playerId;
        currentPlayer.name = data.playerName;
        currentPlayer.isHost = data.isHost;
        showScreen('lobby');
        showNotification(`Chào mừng ${data.playerName}!`);
    });

    socket.on('updatePlayers', (playersList) => {
        players = playersList;
        updatePlayersGrid();
        updatePlayerCount();
        updateStartButton();
    });

    socket.on('gameStarted', (data) => {
        currentGame = data.game;
        showScreen(getScreenName(data.game));
        showNotification(`Game ${getGameName(data.game)} bắt đầu!`);
    });

    // Quick Draw events
    socket.on('newRound', (data) => {
        displayNewRound(data);
    });

    socket.on('draw', (data) => {
        drawOnCanvas(data);
    });

    socket.on('correctGuess', (data) => {
        addChatMessage(`${data.player} đã đoán đúng! +${data.points} điểm`, 'correct');
        updateScoreboard(data.scores);
    });

    socket.on('chatMessage', (data) => {
        addChatMessage(`${data.player}: ${data.message}`, 'normal');
    });

    socket.on('updateScores', (scores) => {
        updateScoreboard(scores);
    });

    socket.on('gameOver', (data) => {
        showGameOver(data);
    });

    // Trivia events
    socket.on('triviaQuestion', (data) => {
        displayTriviaQuestion(data);
    });

    socket.on('triviaResults', (data) => {
        showTriviaResults(data);
    });

    socket.on('triviaScores', (scores) => {
        updateTriviaScoreboard(scores);
    });

    // Spy Hunt events
    socket.on('spyRole', (data) => {
        displaySpyRole(data);
    });

    socket.on('spyChat', (data) => {
        addSpyChat(data);
    });

    socket.on('votingTime', () => {
        startVoting();
    });

    socket.on('voteResults', (data) => {
        showVoteResults(data);
    });

    socket.on('error', (message) => {
        showNotification(message);
    });
}

// Join/Leave functions
function joinGame() {
    const name = document.getElementById('playerName').value.trim();
    if (name.length < 2) {
        showNotification('Tên phải có ít nhất 2 ký tự!');
        return;
    }
    socket.emit('joinGame', { playerName: name });
}

function leaveGame() {
    socket.emit('leaveGame');
    showScreen('home');
    document.getElementById('playerName').value = '';
}

function startSelectedGame() {
    if (!currentGame || !currentPlayer.isHost) return;
    socket.emit('startGame', { game: currentGame });
}

// UI Updates
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function updatePlayersGrid() {
    const grid = document.getElementById('playersGrid');
    grid.innerHTML = '';

    players.forEach(player => {
        const card = document.createElement('div');
        card.className = `player-card ${player.isHost ? 'host' : ''}`;
        card.innerHTML = `
            <span class="player-icon">${player.isHost ? '👑' : '🎮'}</span>
            <div>${player.name}</div>
        `;
        grid.appendChild(card);
    });
}

function updatePlayerCount() {
    document.getElementById('playerCount').textContent = `${players.length} người online`;
}

function updateStartButton() {
    const btn = document.getElementById('startGameBtn');
    const canStart = players.length >= 3 && currentGame && currentPlayer.isHost;
    btn.disabled = !canStart;

    if (!currentPlayer.isHost) {
        btn.textContent = 'Chờ host bắt đầu game...';
    } else if (players.length < 3) {
        btn.textContent = `Bắt đầu game (cần ít nhất 3 người - còn ${3 - players.length})`;
    } else {
        btn.textContent = 'Bắt đầu game!';
    }
}

function showNotification(message) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

// Canvas Setup
let canvas, ctx, isDrawing = false;
let lastX = 0, lastY = 0;

function setupCanvas() {
    canvas = document.getElementById('drawCanvas');
    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
}

function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const color = document.getElementById('colorPicker').value;
    const size = document.getElementById('brushSize').value;

    drawLine(lastX, lastY, x, y, color, size);

    socket.emit('draw', {
        x0: lastX / canvas.width,
        y0: lastY / canvas.height,
        x1: x / canvas.width,
        y1: y / canvas.height,
        color: color,
        size: size
    });

    lastX = x;
    lastY = y;
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function drawLine(x0, y0, x1, y1, color, size) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

function drawOnCanvas(data) {
    const x0 = data.x0 * canvas.width;
    const y0 = data.y0 * canvas.height;
    const x1 = data.x1 * canvas.width;
    const y1 = data.y1 * canvas.height;
    drawLine(x0, y0, x1, y1, data.color, data.size);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clearCanvas');
}

// Quick Draw functions
function displayNewRound(data) {
    clearCanvas();
    document.getElementById('currentDrawer').textContent =
        data.drawer === currentPlayer.id ? 'Bạn đang vẽ!' : `${data.drawerName} đang vẽ`;

    if (data.drawer === currentPlayer.id) {
        document.getElementById('wordToDrawDisplay').textContent = `Từ: ${data.word}`;
        canvas.style.pointerEvents = 'auto';
    } else {
        document.getElementById('wordToDrawDisplay').textContent = `Từ: ${'⭐'.repeat(data.wordLength)}`;
        canvas.style.pointerEvents = 'none';
    }

    document.getElementById('chatMessages').innerHTML = '';
    startTimer('drawTimer', data.time);
}

function sendGuess() {
    const input = document.getElementById('guessInput');
    const guess = input.value.trim();
    if (!guess) return;

    socket.emit('guess', { guess });
    input.value = '';
}

function addChatMessage(message, type = 'normal') {
    const chatDiv = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${type}`;
    msgDiv.textContent = message;
    chatDiv.appendChild(msgDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function updateScoreboard(scores) {
    const scoreboard = document.getElementById('gameScoreboard');
    scoreboard.innerHTML = '<h3>🏆 Bảng điểm</h3>';

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([playerId, score]) => {
        const player = players.find(p => p.id === playerId);
        if (player) {
            const item = document.createElement('div');
            item.className = 'score-item';
            item.innerHTML = `
                <span>${player.name}</span>
                <span class="score">${score}</span>
            `;
            scoreboard.appendChild(item);
        }
    });
}

// Trivia functions
function displayTriviaQuestion(data) {
    document.getElementById('triviaQuestion').textContent = data.question;
    document.getElementById('triviaRound').textContent = `Câu ${data.round}/10`;

    const answersGrid = document.getElementById('answersGrid');
    answersGrid.innerHTML = '';

    data.answers.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = answer;
        btn.addEventListener('click', () => selectAnswer(index, btn));
        answersGrid.appendChild(btn);
    });

    startTimer('triviaTimer', 15);
}

function selectAnswer(index, btn) {
    document.querySelectorAll('.answer-btn').forEach(b => {
        b.classList.remove('selected');
        b.disabled = true;
    });
    btn.classList.add('selected');
    socket.emit('triviaAnswer', { answer: index });
}

function showTriviaResults(data) {
    const buttons = document.querySelectorAll('.answer-btn');
    buttons[data.correctAnswer].classList.add('correct');

    if (data.playerAnswer !== undefined && data.playerAnswer !== data.correctAnswer) {
        buttons[data.playerAnswer].classList.add('incorrect');
    }

    setTimeout(() => {
        buttons.forEach(btn => {
            btn.classList.remove('selected', 'correct', 'incorrect');
            btn.disabled = false;
        });
    }, 3000);
}

function updateTriviaScoreboard(scores) {
    const scoreboard = document.getElementById('triviaScoreboard');
    scoreboard.innerHTML = '<h3>🏆 Bảng điểm</h3>';

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([playerId, score]) => {
        const player = players.find(p => p.id === playerId);
        if (player) {
            const item = document.createElement('div');
            item.className = 'score-item';
            item.innerHTML = `
                <span>${player.name}</span>
                <span class="score">${score} điểm</span>
            `;
            scoreboard.appendChild(item);
        }
    });
}

// Spy Hunt functions
function displaySpyRole(data) {
    const roleDisplay = document.getElementById('spyRole');
    const locationDisplay = document.getElementById('spyLocation');

    if (data.isSpy) {
        roleDisplay.textContent = '🕵️ Điệp viên';
        locationDisplay.textContent = 'Nhiệm vụ: Tìm địa điểm!';
    } else {
        roleDisplay.textContent = '👥 Dân thường';
        locationDisplay.textContent = `Địa điểm: ${data.location}`;
    }

    document.getElementById('spyChatMessages').innerHTML = '';
    startTimer('spyTimer', 120);
}

function sendSpyChat() {
    const input = document.getElementById('spyChatInput');
    const message = input.value.trim();
    if (!message) return;

    socket.emit('spyChat', { message });
    input.value = '';
}

function addSpyChat(data) {
    const chatDiv = document.getElementById('spyChatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    msgDiv.textContent = `${data.player}: ${data.message}`;
    chatDiv.appendChild(msgDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function startVoting() {
    document.getElementById('votingSection').style.display = 'block';
    const votingButtons = document.getElementById('votingButtons');
    votingButtons.innerHTML = '';

    players.forEach(player => {
        const btn = document.createElement('button');
        btn.className = 'vote-btn';
        btn.textContent = player.name;
        btn.addEventListener('click', () => {
            socket.emit('vote', { playerId: player.id });
            document.querySelectorAll('.vote-btn').forEach(b => b.disabled = true);
        });
        votingButtons.appendChild(btn);
    });
}

function showVoteResults(data) {
    const message = data.spyCaught ?
        `🎉 Bắt được điệp viên ${data.spyName}! Dân thường thắng!` :
        `😈 Điệp viên ${data.spyName} đã thoát! Điệp viên thắng!`;

    showNotification(message);

    setTimeout(() => {
        socket.emit('leaveGame');
        showScreen('lobby');
    }, 5000);
}

// Game Over
function showGameOver(data) {
    const winner = players.find(p => p.id === data.winner);
    showNotification(`🏆 ${winner ? winner.name : 'Unknown'} thắng với ${data.score} điểm!`);

    setTimeout(() => {
        socket.emit('leaveGame');
        showScreen('lobby');
    }, 5000);
}

// Timer
function startTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    let timeLeft = seconds;

    const interval = setInterval(() => {
        element.textContent = `${timeLeft}s`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(interval);
        }
    }, 1000);
}

// Helper functions
function getScreenName(game) {
    const map = {
        'quickdraw': 'quickDraw',
        'trivia': 'trivia',
        'spy': 'spy'
    };
    return map[game] || 'lobby';
}

function getGameName(game) {
    const map = {
        'quickdraw': 'Quick Draw',
        'trivia': 'Trivia Battle',
        'spy': 'Spy Hunt'
    };
    return map[game] || game;
}