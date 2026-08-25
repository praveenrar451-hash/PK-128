const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// PeerJS Server setup on same port
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/'
});

app.use('/peerjs', peerServer);
app.use(express.static(path.join(__dirname, 'public')));

let onlineUsers = new Map(); // username -> socket.id
let userLastSeen = {}; // username -> time
let chatHistory = {}; // conversation key -> array of messages

io.on('connection', (socket) => {
    let currentUsername = '';

    socket.on('register_user', ({ username, time }) => {
        currentUsername = username;
        onlineUsers.set(username.toLowerCase(), socket.id);
        delete userLastSeen[username.toLowerCase()];
        broadcastContacts();
    });

    socket.on('load_private_chat', ({ user1, user2 }) => {
        const key = [user1.toLowerCase(), user2.toLowerCase()].sort().join('_');
        socket.emit('load_history', chatHistory[key] || []);
    });

    socket.on('private_message', (msg) => {
        const key = [msg.sender.toLowerCase(), msg.receiver.toLowerCase()].sort().join('_');
        if (!chatHistory[key]) chatHistory[key] = [];
        
        msg.status = 'sent';
        chatHistory[key].push(msg);

        // Send to receiver if online
        const receiverSocketId = onlineUsers.get(msg.receiver.toLowerCase());
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('chat_message', msg);
        }
        // Send back to sender for confirmation
        socket.emit('chat_message', msg);
    });

    socket.on('mark_read', ({ sender, receiver }) => {
        const key = [sender.toLowerCase(), receiver.toLowerCase()].sort().join('_');
        if (chatHistory[key]) {
            chatHistory[key].forEach(m => {
                if (m.sender.toLowerCase() === sender.toLowerCase()) {
                    m.status = 'read';
                }
            });
        }
    });

    socket.on('typing', ({ receiver, isTyping, sender }) => {
        const receiverSocketId = onlineUsers.get(receiver.toLowerCase());
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('display_typing', { sender, isTyping });
        }
    });

    socket.on('disconnect', () => {
        if (currentUsername) {
            onlineUsers.delete(currentUsername.toLowerCase());
            userLastSeen[currentUsername.toLowerCase()] = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            broadcastContacts();
        }
    });
});

function broadcastContacts() {
    const allUsers = Array.from(new Set([...onlineUsers.keys(), ...Object.keys(userLastSeen)]))
                          .map(u => u.charAt(0).toUpperCase() + u.slice(1));
    const onlineList = Array.from(onlineUsers.keys()).map(u => u.charAt(0).toUpperCase() + u.slice(1));
    
    io.emit('contacts_update', {
        contacts: allUsers,
        online: onlineList,
        lastSeen: userLastSeen
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
