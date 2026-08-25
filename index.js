const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const activeUsers = {}; // socket.id -> username
const FIXED_PASSWORD = "272009";

io.on('connection', (socket) => {
    socket.on('register', ({ username, password }, callback) => {
        if (!username) return callback({ success: false, message: 'Username zaroori hai!' });
        if (password !== FIXED_PASSWORD) {
            return callback({ success: false, message: 'Galat Password!' });
        }
        
        // Check if username already taken
        if (Object.values(activeUsers).includes(username)) {
            return callback({ success: false, message: 'Yeh username pehle se online hai!' });
        }

        activeUsers[socket.id] = username;
        callback({ success: true });
        io.emit('update_users', activeUsers);
    });

    // Private / Personal Messaging between contacts
    socket.on('private_message', ({ toSocketId, message, sender }) => {
        io.to(toSocketId).emit('private_message', { sender, message, fromSocketId: socket.id });
    });

    socket.on('disconnect', () => {
        delete activeUsers[socket.id];
        io.emit('update_users', activeUsers);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
