const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const activeUsers = {};
const FIXED_PASSWORD = "272009";

io.on('connection', (socket) => {
    socket.on('register', ({ username, password }, callback) => {
        if (!username) return callback({ success: false, message: 'Username daalna zaroori hai!' });
        if (password !== FIXED_PASSWORD) {
            return callback({ success: false, message: 'Galat Password! Sahi password "272009" hai.' });
        }
        
        activeUsers[socket.id] = username;
        callback({ success: true });
        io.emit('update_users', Object.values(activeUsers));
    });

    socket.on('chat_message', (data) => {
        io.emit('chat_message', data);
    });

    socket.on('disconnect', () => {
        delete activeUsers[socket.id];
        io.emit('update_users', Object.values(activeUsers));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
