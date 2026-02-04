const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Game state
let players = [];
let currentGame = null;
let gameState = {
    quickDraw: {
        currentDrawer: null,
        currentWord: '',
        round: 0,
        scores: {},
        guessedPlayers: new Set(),
        timer: null
    },
    trivia: {
        currentQuestion: null,
        round: 0,
        scores: {},
        answers: {},
        timer: null
    },
    spy: {
        spy: null,
        location: '',
        votes: {},
        timer: null
    }
};

// Word lists for Quick Draw
const drawWords = [
    'mèo', 'chó', 'nhà', 'xe hơi', 'cây', 'hoa', 'mặt trời', 'mặt trăng', 'sao',
    'máy bay', 'tàu thủy', 'xe đạp', 'tivi', 'điện thoại', 'máy tính', 'sách',
    'bàn', 'ghế', 'cửa sổ', 'cửa', 'ô tô', 'bánh mì', 'cà phê', 'trà', 'nước',
    'cá', 'chim', 'bướm', 'con ong', 'con bò', 'con gà', 'con vịt', 'táo', 'cam',
    'chuối', 'dưa hấu', 'nho', 'dâu', 'kem', 'kẹo', 'bánh ngọt', 'pizza'
];

// Trivia questions
const triviaQuestions = [
    {
        question: 'Thủ đô của Việt Nam là gì?',
        answers: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
        correct: 0
    },
    {
        question: 'Ngôn ngữ lập trình nào được sử dụng cho web frontend?',
        answers: ['Python', 'Java', 'JavaScript', 'C++'],
        correct: 2
    },
    {
        question: 'Ai là người phát minh ra bóng đèn?',
        answers: ['Tesla', 'Edison', 'Einstein', 'Newton'],
        correct: 1
    },
    {
        question: 'Hành tinh nào lớn nhất trong hệ mặt trời?',
        answers: ['Trái Đất', 'Sao Hỏa', 'Sao Mộc', 'Sao Thổ'],
        correct: 2
    },
    {
        question: '2 + 2 x 2 = ?',
        answers: ['6', '8', '4', '10'],
        correct: 0
    },
    {
        question: 'HTML viết tắt của gì?',
        answers: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlinks and Text Markup Language'],
        correct: 0
    },
    {
        question: 'Đại dương nào lớn nhất thế giới?',
        answers: ['Đại Tây Dương', 'Ấn Độ Dương', 'Thái Bình Dương', 'Bắc Băng Dương'],
        correct: 2
    },
    {
        question: 'Trong năm có bao nhiêu ngày?',
        answers: ['364', '365', '366', '360'],
        correct: 1
    },
    {
        question: 'Nước nào có dân số đông nhất thế giới?',
        answers: ['Ấn Độ', 'Trung Quốc', 'Mỹ', 'Indonesia'],
        correct: 0
    },
    {
        question: 'CSS dùng để làm gì?',
        answers: ['Xử lý logic', 'Tạo cơ sở dữ liệu', 'Trang trí web', 'Viết server'],
        correct: 2
    }
];

// Spy Hunt locations
const spyLocations = [
    'Nhà hàng', 'Bệnh viện', 'Trường học', 'Siêu thị', 'Công viên',
    'Rạp chiếu phim', 'Sân bay', 'Bến xe', 'Bãi biển', 'Khách sạn',
    'Thư viện', 'Phòng gym', 'Ngân hàng', 'Cửa hàng cà phê', 'Văn phòng'
];

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join game
    socket.on('joinGame', (data) => {
        const playerName = data.playerName || 'Player';
        const isHost = players.length === 0;

        const player = {
            id: socket.id,
            name: playerName,
            isHost: isHost
        };

        players.push(player);

        socket.emit('playerJoined', {
            playerId: socket.id,
            playerName: playerName,
            isHost: isHost
        });

        io.emit('updatePlayers', players);
        console.log(`${playerName} joined. Total players: ${players.length}`);
    });

    // Start game
    socket.on('startGame', (data) => {
        const player = players.find(p => p.id === socket.id);
        if (!player || !player.isHost) return;

        currentGame = data.game;
        io.emit('gameStarted', { game: currentGame });

        // Start specific game
        if (currentGame === 'quickdraw') {
            startQuickDraw();
        } else if (currentGame === 'trivia') {
            startTrivia();
        } else if (currentGame === 'spy') {
            startSpyHunt();
        }
    });

    // Quick Draw events
    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);
    });

    socket.on('clearCanvas', () => {
        socket.broadcast.emit('clearCanvas');
    });

    socket.on('guess', (data) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        const guess = data.guess.toLowerCase().trim();
        const word = gameState.quickDraw.currentWord.toLowerCase();

        if (guess === word && !gameState.quickDraw.guessedPlayers.has(socket.id)) {
            gameState.quickDraw.guessedPlayers.add(socket.id);
            const points = Math.max(100 - gameState.quickDraw.guessedPlayers.size * 20, 20);
            gameState.quickDraw.scores[socket.id] = (gameState.quickDraw.scores[socket.id] || 0) + points;

            io.emit('correctGuess', {
                player: player.name,
                points: points,
                scores: gameState.quickDraw.scores
            });

            // If everyone guessed, next round
            if (gameState.quickDraw.guessedPlayers.size >= players.length - 1) {
                nextQuickDrawRound();
            }
        } else {
            io.emit('chatMessage', {
                player: player.name,
                message: data.guess
            });
        }
    });

    // Trivia events
    socket.on('triviaAnswer', (data) => {
        gameState.trivia.answers[socket.id] = data.answer;

        // Check if correct
        if (data.answer === gameState.trivia.currentQuestion.correct) {
            gameState.trivia.scores[socket.id] = (gameState.trivia.scores[socket.id] || 0) + 100;
        }

        socket.emit('triviaResults', {
            correctAnswer: gameState.trivia.currentQuestion.correct,
            playerAnswer: data.answer
        });
    });

    // Spy Hunt events
    socket.on('spyChat', (data) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        io.emit('spyChat', {
            player: player.name,
            message: data.message
        });
    });

    socket.on('vote', (data) => {
        gameState.spy.votes[socket.id] = data.playerId;

        // If everyone voted
        if (Object.keys(gameState.spy.votes).length >= players.length) {
            endSpyHunt();
        }
    });

    // Leave game
    socket.on('leaveGame', () => {
        leaveGame(socket.id);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        leaveGame(socket.id);
    });
});

// Quick Draw game logic
function startQuickDraw() {
    gameState.quickDraw.round = 0;
    gameState.quickDraw.scores = {};
    players.forEach(p => gameState.quickDraw.scores[p.id] = 0);
    nextQuickDrawRound();
}

function nextQuickDrawRound() {
    if (gameState.quickDraw.timer) clearTimeout(gameState.quickDraw.timer);

    gameState.quickDraw.round++;
    if (gameState.quickDraw.round > players.length * 2) {
        endQuickDraw();
        return;
    }

    const drawerIndex = (gameState.quickDraw.round - 1) % players.length;
    gameState.quickDraw.currentDrawer = players[drawerIndex].id;
    gameState.quickDraw.currentWord = drawWords[Math.floor(Math.random() * drawWords.length)];
    gameState.quickDraw.guessedPlayers.clear();

    const drawer = players[drawerIndex];
    io.emit('newRound', {
        drawer: drawer.id,
        drawerName: drawer.name,
        word: gameState.quickDraw.currentWord,
        wordLength: gameState.quickDraw.currentWord.length,
        time: 60
    });

    io.to(drawer.id).emit('newRound', {
        drawer: drawer.id,
        drawerName: drawer.name,
        word: gameState.quickDraw.currentWord,
        wordLength: gameState.quickDraw.currentWord.length,
        time: 60
    });

    gameState.quickDraw.timer = setTimeout(() => {
        nextQuickDrawRound();
    }, 60000);
}

function endQuickDraw() {
    if (gameState.quickDraw.timer) clearTimeout(gameState.quickDraw.timer);

    const winner = Object.entries(gameState.quickDraw.scores)
        .sort((a, b) => b[1] - a[1])[0];

    io.emit('gameOver', {
        winner: winner[0],
        score: winner[1],
        scores: gameState.quickDraw.scores
    });

    currentGame = null;
}

// Trivia game logic
function startTrivia() {
    gameState.trivia.round = 0;
    gameState.trivia.scores = {};
    players.forEach(p => gameState.trivia.scores[p.id] = 0);
    nextTriviaQuestion();
}

function nextTriviaQuestion() {
    if (gameState.trivia.timer) clearTimeout(gameState.trivia.timer);

    gameState.trivia.round++;
    if (gameState.trivia.round > 10) {
        endTrivia();
        return;
    }

    const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    gameState.trivia.currentQuestion = question;
    gameState.trivia.answers = {};

    io.emit('triviaQuestion', {
        question: question.question,
        answers: question.answers,
        round: gameState.trivia.round
    });

    io.emit('triviaScores', gameState.trivia.scores);

    gameState.trivia.timer = setTimeout(() => {
        nextTriviaQuestion();
    }, 15000);
}

function endTrivia() {
    if (gameState.trivia.timer) clearTimeout(gameState.trivia.timer);

    const winner = Object.entries(gameState.trivia.scores)
        .sort((a, b) => b[1] - a[1])[0];

    io.emit('gameOver', {
        winner: winner[0],
        score: winner[1],
        scores: gameState.trivia.scores
    });

    currentGame = null;
}

// Spy Hunt game logic
function startSpyHunt() {
    const spyIndex = Math.floor(Math.random() * players.length);
    gameState.spy.spy = players[spyIndex].id;
    gameState.spy.location = spyLocations[Math.floor(Math.random() * spyLocations.length)];
    gameState.spy.votes = {};

    players.forEach(player => {
        const isSpy = player.id === gameState.spy.spy;
        io.to(player.id).emit('spyRole', {
            isSpy: isSpy,
            location: isSpy ? null : gameState.spy.location
        });
    });

    gameState.spy.timer = setTimeout(() => {
        io.emit('votingTime');
    }, 120000);
}

function endSpyHunt() {
    if (gameState.spy.timer) clearTimeout(gameState.spy.timer);

    // Count votes
    const voteCounts = {};
    Object.values(gameState.spy.votes).forEach(playerId => {
        voteCounts[playerId] = (voteCounts[playerId] || 0) + 1;
    });

    const mostVoted = Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1])[0];

    const spyCaught = mostVoted && mostVoted[0] === gameState.spy.spy;
    const spyPlayer = players.find(p => p.id === gameState.spy.spy);

    io.emit('voteResults', {
        spyCaught: spyCaught,
        spyName: spyPlayer ? spyPlayer.name : 'Unknown',
        location: gameState.spy.location
    });

    currentGame = null;
}

// Leave game
function leaveGame(socketId) {
    const playerIndex = players.findIndex(p => p.id === socketId);
    if (playerIndex === -1) return;

    const wasHost = players[playerIndex].isHost;
    players.splice(playerIndex, 1);

    // Assign new host if needed
    if (wasHost && players.length > 0) {
        players[0].isHost = true;
    }

    io.emit('updatePlayers', players);

    // End game if too few players
    if (players.length < 3 && currentGame) {
        currentGame = null;
        io.emit('error', 'Không đủ người chơi, trở về lobby');
    }
}

// Start server
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});