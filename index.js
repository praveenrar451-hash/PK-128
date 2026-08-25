const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Ek user jud gaya hai:', socket.id);

    socket.on('chat_message', (data) => {
        io.emit('chat_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User hat gaya hai');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server chal pada port ${PORT} par`);
});
