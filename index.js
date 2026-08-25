const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Store registered users and active sessions
const users = {}; // username -> password
const activeUsers = {}; // socket.id -> username

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Register user
    socket.on('register', ({ username, password }, callback) => {
        if (!username || !password) return callback({ success: false, message: 'Fill all fields' });
        
        if (users[username]) {
            if (users[username] === password) {
                activeUsers[socket.id] = username;
                callback({ success: true, message: 'Login successful' });
                io.emit('update_users', Object.values(activeUsers));
            } else {
                callback({ success: false, message: 'Incorrect password!' });
            }
        } else {
            users[username] = password;
            activeUsers[socket.id] = username;
            callback({ success: true, message: 'Account created & logged in!' });
            io.emit('update_users', Object.values(activeUsers));
        }
    });

    // Chat Message
    socket.on('chat_message', (data) => {
        io.emit('chat_message', data);
    });

    // WebRTC Signaling for Real-time Calls
    socket.on('call_user', (data) => {
        socket.broadcast.emit('incoming_call', data);
    });

    socket.on('disconnect', () => {
        delete activeUsers[socket.id];
        io.emit('update_users', Object.values(activeUsers));
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

