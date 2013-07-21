var app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server);

server.listen(3000);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

app.get('/asd', function (req, res) {
    res.write("hey!");
});

io.sockets.on('connection', function (socket) {
    socket.on('set nickname', function (name) {
        socket.set('nickname', name, function () {
            socket.emit('ready');
        });
    });

    socket.on('msg', function () {
        socket.get('nickname', function (err, name) {
            console.log('Chat message by ', name);
        });
    });

    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
    io.sockets.emit('this', { will: 'be received by everyone'});

    socket.on('private message', function (from, msg) {
        console.log('I received a private message by ', from, ' saying ', msg);
    });

    socket.on('disconnect', function () {
        io.sockets.emit('user disconnected');
        console.log('user disconnected');
    });
});