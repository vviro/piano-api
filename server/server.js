var express = require('express'),
    sio = require('socket.io'),
    http = require('http'),
    app = express();

var server = http.createServer(app);

app.configure(function () {
    app.use(express.static(__dirname + '/public'));
    app.use(app.router);
});

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

var io = sio.listen(server);

server.listen(8124);


var connectedSockets = {} ;
var connectedCount = 0;

io.sockets.on('connection', function (socket) {
    socket.on('addme',function(username) {
        if (connectedSockets[username]) {
            socket.emit('existing');
        }
        else{
            socket.username = username;
            connectedCount += 1;
            connectedSockets[username] = socket;
            socket.emit('chat', 'SERVER', 'You have connected (currently online:' + connectedCount +')');
            socket.broadcast.emit('chat', 'SERVER', username + ' is on deck (currently online:' + connectedCount +')');
        }
    });

    socket.on('sendchat', function(data) {
        io.sockets.emit('chat', socket.username, data);
    });

    socket.on('whisper', function(username, message) {
        if(connectedSockets[username]) {
            connectedSockets[username].emit('whisperMessage', socket.username, message);
        }
    });

    socket.on('disconnect', function() {
        connectedCount -= 1;
        connectedSockets[socket.username]=null
        io.sockets.emit('chat', 'SERVER', socket.username + ' has left the building (currently online:' + connectedCount +')');
    });
});
