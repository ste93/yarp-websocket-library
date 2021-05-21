"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const waitForOpenConnection = (socket) => {
    return new Promise((resolve, reject) => {
        const maxNumberOfAttempts = 10;
        const intervalTime = 200; //ms
        let currentAttempt = 0;
        const interval = setInterval(() => {
            if (currentAttempt > maxNumberOfAttempts - 1) {
                clearInterval(interval);
                reject(new Error('Maximum number of attempts exceeded'));
            }
            else if (socket.readyState === socket.OPEN) {
                clearInterval(interval);
                resolve("ok");
            }
            currentAttempt++;
        }, intervalTime);
    });
};
const sendMessage = (socket, msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (socket.readyState !== socket.OPEN) {
        try {
            yield waitForOpenConnection(socket);
            socket.send(msg);
        }
        catch (err) {
            console.error(err);
        }
    }
    else {
        socket.send(msg);
    }
});
function getNumberFromBytes(data, startingPoint) {
    var num = 0;
    for (var i = 0; i < 4; i++) {
        num = num + (data.charCodeAt(i + startingPoint) * (Math.pow(256, i)));
    }
    return num;
}
function handleBottle(dataReceived) {
    var baselength = 0; //avoiding protocol, need to check in the response
    var bottleType = getNumberFromBytes(dataReceived, baselength);
    baselength = baselength + 4;
    var bottleLength = getNumberFromBytes(dataReceived, baselength);
    baselength = baselength + 4;
    var items = [];
    for (var i = 0; i < bottleLength; i++) {
        var itemLength = getNumberFromBytes(dataReceived, baselength);
        baselength = baselength + 4;
        console.log(baselength);
        console.log(itemLength);
        items[i] = dataReceived.substring(baselength, baselength + itemLength);
        baselength = baselength + itemLength;
    }
    return items;
}
function sendData(websocket, message) {
    websocket.send(createBottleFromString(message));
}
function createBottleFromString(data) {
    var prot = String.fromCharCode(0, 0, 0, 0, 126, 0, 0, 1);
    var encodedata = "d\0";
    var bottletype = String.fromCharCode(4, 0, 0, 0);
    var message = prot + encodedata + bottletype;
    var items = data.split(" ");
    var bottlelength = createcharfromint(items.length);
    message = message.concat(bottlelength);
    for (var x in items) {
        if (items[x].length < 255) {
            var itemlength = String.fromCharCode(items[x].length, 0, 0, 0);
            message = message.concat(itemlength + items[x]);
        }
    }
    return message;
}
function createcharfromint(num) {
    var char1 = num % 256;
    num = num / 256;
    var char2 = num % 256;
    num = num / 256;
    var char3 = num % 256;
    num = num / 256;
    var char4 = num % 256;
    return String.fromCharCode(char1, char2, char3, char4);
}
function closeConnection(websocket) {
    var prot = String.fromCharCode(0, 0, 0, 0, 126, 0, 0, 1);
    var encodedata = "q\0";
    var message = prot + encodedata;
    websocket.send(message);
}
function revertConnection(websocket) {
    var prot = String.fromCharCode(0, 0, 0, 0, 126, 0, 0, 1);
    var encodedata = "r\0";
    var message = prot + encodedata;
    websocket.send(message);
}
function printBuffer(buffer) {
    if (buffer.byteLength > 8) {
        var uint8View = new Uint8Array(buffer);
        var array = Array.from(uint8View);
        console.log(handleBottle(String.fromCharCode.apply(String, array)));
    }
    else {
        // header data0000~D01
    }
}
function logMessage(data) {
    data.data.arrayBuffer().then((buffer) => (printBuffer(buffer)));
}
var websocket = new WebSocket("ws://localhost:10002?ws");
var msg = createBottleFromString("asdfa asdfa aaa");
websocket.onmessage = logMessage;
sendMessage(websocket, msg);
