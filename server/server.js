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
        // falls leer oder leerzeichen folgt invalid
        if(username == null || username.match(/(?:\w+)(?:\s+)(?:\w+)/)){
            socket.emit('invalid');
        }
        else if (connectedSockets[username]) {
            socket.emit('existing');
        }
        else{
            socket.username = username;
            connectedCount += 1;
            connectedSockets[username] = socket;
            socket.emit('chat', 'SERVER', 'You have connected');
            socket.broadcast.emit('chat', 'SERVER', username + ' is on deck (currently online:' + connectedCount +')');

            io.sockets.emit('count', connectedCount);
        }
    });

    socket.on('sendchat', function(data) {

        // Testet ob String wie folgt aufgebaut ist: /w name message
        var reg = /(^|\/\w)(?:\s+)(\w+)(.*)/;

        var match = reg.exec(data);

        /**match[0] beinhaltet ganzen string
         * match[1] tag
         * match[2] namen der angewisperten person
         * match[3] nachricht
         */
        //if wisper tag, name und nachricht nicht leer
        if(match && match[1]=="/w" && match[2] != null && match[3] != null){
            //falls name vorhanden schicken
            if(connectedSockets[match[2]]){
                connectedSockets[match[2]].emit('whisperMessageReceive', socket.username, match[3]);
                socket.emit('whisperMessageSend', match[2], match [3])
            }
            //sonst note schreiben
            else{
                socket.emit('chat', 'SERVER', 'User ' + match[2]+' not online');
            }

        }
        //normale nachricht
        else{
            io.sockets.emit('chat', socket.username, data);
        }
    });

    socket.on('sendJSON', function(data) {
        //console.log('type:  '+data.type + ' and name:' + data.name);
    });

    socket.on('disconnect', function() {
        connectedCount -= 1;
        connectedSockets[socket.username]=null
        io.sockets.emit('chat', 'SERVER', socket.username + ' has left the building');
        io.sockets.emit('count', connectedCount);
    });
});
