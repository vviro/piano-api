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

//Variable fuer die eingehenden Clients, wird hochgezaehlt
var userID = 0;
//anzahl aktueller clients die verbunden sind
var currentlyConnected = 0;

Client = function(userID, userName, socket){
    this.userID = userID;
    this.userName = userName;
    this.playing = false;
    this.socket = socket;
}

Clients = function(){
    this.user = [];
}

//gibt client zurueck per id suche
Clients.prototype.getUserByID = function(userID){
    var client = this.user[userID];
    return client;
}

//gibt client zurueck per namen suche
Clients.prototype.getUserByName = function(userName){
    for(var i = 0; i < this.user.length; i++){
        if(this.user[i].userName == userName){
            var client = this.user[i];
            return client;
        }
    }
    return;
}


//fuegt neuen Client der liste hinzu
Clients.prototype.addUser = function(userName, socket){
    this.user[userID] = new Client(userID,userName, socket);
    currentlyConnected += 1;
    userID += 1;

}



//gibt array mit namen zurueck
Clients.prototype.getNamesArray = function(){
    var names = [];
    for(var i = 0; i < this.user.length; i++){
        if(this.user[i]){
            names.push(this.user[i].userName);
        }
    }
    return names;
}

//gibt array mit status zurueck fuer anzeige
Clients.prototype.getStatusArray = function(){
    var status = [];
    for(var i = 0; i < this.user.length; i++){
        if(this.user[i]){
            status.push(this.user[i].playing);
        }
    }
    return status;
}

Clients.prototype.getUsername = function(userID){
    return this.user[userID].userName;
}

//testet obs namen gibt, true wenn ja, false wenn nein
Clients.prototype.existingName = function(userName){
    for(var i = 0; i < this.user.length; i++){
        if(this.user[i]){
            if(this.user[i].userName == userName){
                //fall dass es namen schon gibt
                return true;
            }
        }
    }
    return false;
}

//im moment noch rausloeschen
Clients.prototype.disconnectUser = function(userID){
   this.user[userID] = null;
    currentlyConnected -= 1;
}

var clients = new Clients();


io.sockets.on('connection', function (socket) {
    socket.on('addme',function(username) {
        // falls leer oder leerzeichen folgt invalid
        if(username == null || username == '' || username.match(/(?:\w+)(?:\s+)(?:\w+)/)){
            socket.emit('invalid');
        }
        else if (clients.existingName(username)) {
            socket.emit('existing');
        }
        else{
            socket.userID = userID;

            clients.addUser(username, socket);

            socket.emit('chat', 'SERVER', 'You have connected');
            socket.broadcast.emit('chat', 'SERVER', username + ' is on deck (currently online:' + currentlyConnected +')');
            io.sockets.emit('count', currentlyConnected);

            var onlineUser = clients.getNamesArray();
            var status = clients.getStatusArray();

            io.sockets.emit('onlineUser', onlineUser, status);

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
            if(clients.existingName(match[2])){


                var client = clients.getUserByName(match[2]);
                client.socket.emit('whisperMessageReceive', client.userName, match[3]);
                socket.emit('whisperMessageSend', match[2], match [3])
            }
            //sonst note schreiben
            else{
                socket.emit('chat', 'SERVER', 'User ' + match[2]+' not online');
            }

        }
        //normale nachricht
        else{
            io.sockets.emit('chat', clients.getUsername(socket.userID), data);
        }
    });

    socket.on('sendJSON', function(data) {
        //console.log('type:  '+data.type + ' and name:' + data.name);
    });

    socket.on('status', function(boolean) {

        clients.user[socket.userID].playing = boolean;
        var onlineUser = clients.getNamesArray();
        var status = clients.getStatusArray();

        io.sockets.emit('onlineUser', onlineUser, status);
    });


    //midi
    socket.on('sendMidiEvent', function(a,b,c) {
        //console.log(a,b,c);
        socket.broadcast.emit('receiveMidiEvent', a,b,c);
    });

    socket.on('disconnect', function() {
        //fall dass man ohne anmelden gleich schliesst
        if(socket.userID != null){
            socket.broadcast.emit('chat', 'SERVER', clients.getUsername(socket.userID) + ' has left the building');
            clients.disconnectUser(socket.userID);
            io.sockets.emit('count', currentlyConnected);

            var onlineUser = clients.getNamesArray();
            var status = clients.getStatusArray();

            io.sockets.emit('onlineUser', onlineUser, status);
        }


    });
});
