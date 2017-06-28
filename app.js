var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendfile('index.html');
});

var tripID = 0;
var userID = 0;
var tripList = [];

//Whenever someone connects this gets executed
io.on('connection', function (socket) {
    console.log('A user connected');

    socket.emit('setUserId', ++userID);
    var curID = userID;
    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
        console.log('A user disconnected');
        //broadcasting to all connected clients except the one who triggered the event aka the one who ended the ride,, he can remove markers on his own client side. no need for server involvment
        var pos = {
            lat: -1,
            lng: -1
        };
        var i;
        //console.log(driverID);
        for (i = 0; i < tripList.length; i++) {
            //console.log('updateTrip' + tripList[i].tId + tripList[i].dest, tripList[i].curPos, tripList[i].did);
            console.log(tripList[i].did);
            if (curID == tripList[i].did) {
                break;
            }
        }
        //console.log(tripList[i].did);
        if (i < tripList.length) {
            socket.broadcast.emit('ride-ended', tripList[i].tId, tripList[i].dest, pos, tripList[i].did);
            tripList.splice(i, 1);
        }
    });


    //driver location update event
    socket.on('tripStarted', function (driverID, mdest, pos, response) {
        console.log('here at tripStarted' + mdest);
        tripID++;
        var trip = {
            did: driverID,
            dest: mdest,
            tId: tripID,
            curPos: pos,
            resp: response
        };
        tripList.push(trip);
        //console.log(tripList[0]);
    });

    socket.on('updateTrip', function (driverID, dest, pos) {
        var i;
        for (i = 0; i < tripList.length; i++) {
            //console.log('updateTrip' + tripList[i].tId + tripList[i].dest, tripList[i].curPos, tripList[i].did);
            if (driverID == tripList[i].did) {
                tripList[i].curPos = pos;
                break;
            }
        }
        socket.broadcast.emit('ride-updated', tripList[i].tId, tripList[i].dest, tripList[i].curPos, tripList[i].did);
        //console.log(tripList[i].tId, tripList[i].dest, tripList[i].curPos, tripList[i].did);
    });

    socket.on('join-trip', function (riderID, dest) {
        var i;
        var tripID = -1;
        for (i = 0; i < tripList.length; i++) {
            //console.log('updateTrip' + tripList[i].tId + tripList[i].dest, tripList[i].curPos, tripList[i].did);
            console.log(tripList[i].dest + "  " + dest);
            if (dest == tripList[i].dest) {
                tripID = tripList[i].tId;
                break;
            }

        }


        console.log('jointrip');
        if (i < tripList.length) {
            io.emit('join-trip-reply', tripID, riderID, tripList[i].resp);
        } else {
            io.emit('join-trip-reply', -1, riderID, null);
        }
    });


    //start-ride event triggered
    socket.on('start-ride', function (userlocation, result) {
        //periodic event
        var pointsArray = [];
        //console.log(result.routes);
        var path = result.routes[0].overview_path;
        var legs = result.routes[0].legs;
        for (i = 0; i < legs.length; i++) {
            var steps = legs[i].steps;
            for (j = 0; j < steps.length; j++) {
                var nextSegment = steps[j].path;
                for (k = 0; k < nextSegment.length; k++) {
                    pointsArray.push(nextSegment[k]);
                }
            }
        }

        io.emit('ride-started', userlocation);
        var countdown = pointsArray.length;
        var i = 0;
        setInterval(function () {
            countdown--;
            if (countdown >= 0) {
                userlocation = pointsArray[i];
                i = i + 50;
                io.emit('ride-started', userlocation);
            }
        }, 1000);
    });



    //end-ride event triggered
    socket.on('end-ride', function (driverID) {
        //broadcasting to all connected clients except the one who triggered the event aka the one who ended the ride,, he can remove markers on his own client side. no need for server involvment
        var pos = {
            lat: -1,
            lng: -1
        };
        var i;
        //console.log(driverID);
        for (i = 0; i < tripList.length; i++) {
            //console.log('updateTrip' + tripList[i].tId + tripList[i].dest, tripList[i].curPos, tripList[i].did);
            console.log(tripList[i].did);
            if (driverID == tripList[i].did) {
                break;
            }
        }
        //console.log(tripList[i].did);
        socket.broadcast.emit('ride-ended', tripList[i].tId, tripList[i].dest, pos, tripList[i].did);
        tripList.splice(i, 1);
        //socket.broadcast.emit('ride-ended', 'there should be stuff added here later I didnt think of em yet');
    });

});

http.listen(process.env.PORT || 3000, function () {
    console.log('listening on *:3000');
});
