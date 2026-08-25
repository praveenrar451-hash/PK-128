const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const users = {}; // socketId -> username
const userCredentials = {}; // username -> password

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Register & Login handling
    socket.on('register', ({ username, password }, callback) => {
        if (!username || !password) {
            return callback({ success: false, message: 'Username aur Password zaroori hai!' });
        }
        if (userCredentials[username] && userCredentials[username] !== password) {
            return callback({ success: false, message: 'Galat Password! Yeh username kisi aur ka hai.' });
        }

        userCredentials[username] = password;
        users[socket.id] = username;

        io.emit('update_users', users);
        callback({ success: true });
    });

    // Handle Private Messages (Text / HTML / Files)
    socket.on('private_message', ({ toSocketId, messageObj }) => {
        if (users[socket.id]) {
            io.to(toSocketId).emit('private_message', {
                messageObj,
                fromSocketId: socket.id
            });
        }
    });

    // Call Signaling Events
    socket.on('call_user', ({ toSocketId, callType, callerName }) => {
        io.to(toSocketId).emit('incoming_call', {
            fromSocketId: socket.id,
            callType,
            callerName
        });
    });

    socket.on('call_answered', ({ toSocketId }) => {
        io.to(toSocketId).emit('call_accepted');
    });

    socket.on('reject_call', ({ toSocketId }) => {
        io.to(toSocketId).emit('call_rejected');
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update_users', users);
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
