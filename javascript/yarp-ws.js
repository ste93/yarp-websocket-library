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
/*
bottle tags (same as yarp, see http://www.yarp.it/latest/Bottle_8h.html)
*/
var bottleTags;
(function (bottleTags) {
    bottleTags[bottleTags["BOTTLE_TAG_INT8"] = 32] = "BOTTLE_TAG_INT8";
    bottleTags[bottleTags["BOTTLE_TAG_INT16"] = 64] = "BOTTLE_TAG_INT16";
    bottleTags[bottleTags["BOTTLE_TAG_INT32"] = 1] = "BOTTLE_TAG_INT32";
    bottleTags[bottleTags["BOTTLE_TAG_INT64"] = 17] = "BOTTLE_TAG_INT64";
    bottleTags[bottleTags["BOTTLE_TAG_VOCAB32"] = 9] = "BOTTLE_TAG_VOCAB32";
    bottleTags[bottleTags["BOTTLE_TAG_FLOAT32"] = 128] = "BOTTLE_TAG_FLOAT32";
    bottleTags[bottleTags["BOTTLE_TAG_FLOAT64"] = 10] = "BOTTLE_TAG_FLOAT64";
    bottleTags[bottleTags["BOTTLE_TAG_STRING"] = 4] = "BOTTLE_TAG_STRING";
    bottleTags[bottleTags["BOTTLE_TAG_BLOB"] = 12] = "BOTTLE_TAG_BLOB";
    bottleTags[bottleTags["BOTTLE_TAG_LIST"] = 256] = "BOTTLE_TAG_LIST";
    bottleTags[bottleTags["BOTTLE_TAG_DICT"] = 512] = "BOTTLE_TAG_DICT"; // 0000 0010 0000 0000
})(bottleTags || (bottleTags = {}));
const getKeyValue = (key) => (obj) => obj[key];
// this function waits until the connection has been established, after 10 attempts it returns a failure
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
// this function sends a message through a websocket, but before sending it waits the socket to be in ready state
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
// this function takes as input an array buffer received from the websocket, then it converts it to a bottle.
function handleBottle(dataReceived) {
    return handleBottle_recursiveFunction(dataReceived, 0, false).bottle;
}
// the function must be called with startingpoint = 0 and nested =false 
function handleBottle_recursiveFunction(dataReceived, startingPoint, nested, nestedType) {
    var view = new DataView(dataReceived, 0);
    var toReturn;
    var bottleType;
    var bytesRead = startingPoint;
    if (nested) {
        bottleType = nestedType;
    }
    else {
        bottleType = view.getInt32(bytesRead, true);
        bytesRead = bytesRead + 4;
    }
    switch (bottleType) {
        case bottleTags.BOTTLE_TAG_INT8:
            var numberRead = view.getInt8(bytesRead);
            toReturn = { type: bottleTags.BOTTLE_TAG_INT8, value: numberRead };
            bytesRead = bytesRead + 1;
            break;
        case bottleTags.BOTTLE_TAG_INT16:
            var numberRead = view.getInt16(bytesRead, true);
            toReturn = { type: bottleTags.BOTTLE_TAG_INT16, value: numberRead };
            bytesRead = bytesRead + 2;
            break;
        case bottleTags.BOTTLE_TAG_INT32:
            var numberRead = view.getInt32(bytesRead, true);
            toReturn = { type: bottleTags.BOTTLE_TAG_INT32, value: numberRead };
            bytesRead = bytesRead + 4;
            break;
        case bottleTags.BOTTLE_TAG_INT64:
            console.log("BOTTLE_TAG_INT64 not implemented");
            toReturn = { type: "ERROR", value: "BOTTLE_TAG_INT64 not implemented" };
            break;
        case bottleTags.BOTTLE_TAG_VOCAB32:
            var numberRead = view.getInt32(bytesRead, true);
            toReturn = { type: bottleTags.BOTTLE_TAG_VOCAB32, value: numberRead };
            bytesRead = bytesRead + 4;
            break;
        case bottleTags.BOTTLE_TAG_FLOAT32:
            var numberRead = view.getFloat32(bytesRead, true);
            toReturn = { type: bottleTags.BOTTLE_TAG_FLOAT32, value: numberRead };
            bytesRead = bytesRead + 4;
            break;
        case bottleTags.BOTTLE_TAG_FLOAT64:
            var numberRead = view.getFloat64(bytesRead, true);
            toReturn = { type: bottleTags.BOTTLE_TAG_FLOAT64, value: numberRead };
            bytesRead = bytesRead + 4;
            break;
        case bottleTags.BOTTLE_TAG_STRING:
            var itemLength = view.getInt32(bytesRead, true);
            bytesRead = bytesRead + 4;
            toReturn = { type: bottleTags.BOTTLE_TAG_STRING, value: convertArrayBufferToString(dataReceived).substring(bytesRead, bytesRead + itemLength) };
            bytesRead = bytesRead + itemLength;
            break;
        case bottleTags.BOTTLE_TAG_BLOB:
            var itemLength = view.getInt32(bytesRead, true);
            bytesRead = bytesRead + 4;
            toReturn = { type: bottleTags.BOTTLE_TAG_BLOB, value: convertArrayBufferToString(dataReceived).substring(bytesRead, bytesRead + itemLength) };
            bytesRead = bytesRead + itemLength;
            break;
        case bottleTags.BOTTLE_TAG_LIST:
            var listLength = view.getInt32(bytesRead, true);
            var listItems = [];
            bytesRead = bytesRead + 4;
            for (var i = 0; i < listLength; i++) {
                var item = handleBottle_recursiveFunction(dataReceived, bytesRead, false);
                bytesRead = bytesRead + item.bytesRead;
                listItems.push(item.bottle);
            }
            toReturn = { type: bottleTags.BOTTLE_TAG_LIST,
                length: listLength,
                value: listItems };
            break;
        // TODO FIXME STE need to implement also LIST + INT and LIST + FLOAT?
        case bottleTags.BOTTLE_TAG_LIST + bottleTags.BOTTLE_TAG_STRING:
            var listLength = view.getInt32(bytesRead, true);
            var listItems = [];
            bytesRead = bytesRead + 4;
            for (var i = 0; i < listLength; i++) {
                var item = handleBottle_recursiveFunction(dataReceived, bytesRead, true, bottleTags.BOTTLE_TAG_STRING);
                bytesRead = bytesRead + item.bytesRead;
                listItems.push(item.bottle);
            }
            toReturn = { type: bottleTags.BOTTLE_TAG_LIST + bottleTags.BOTTLE_TAG_STRING,
                length: listLength,
                value: listItems };
            break;
        case bottleTags.BOTTLE_TAG_DICT: // TODO FIXME STE
            console.log("BOTTLE_TAG_DICT not implemented");
            toReturn = { type: "ERROR", value: "BOTTLE_TAG_DICT not implemented" };
            break;
        default:
            console.log("bottle tag not known");
            toReturn = { type: "ERROR", value: "bottle tag not known" };
            break;
    }
    return { bytesRead: bytesRead - startingPoint, bottle: toReturn };
}
// this function sends the message to the websocket 
function sendData(websocket, message) {
    sendMessage(websocket, createBottleFromString(message));
}
// this function parses a string and creates a bottle, each word divided by space is inserted into a different item of the list
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
// deprecated, need to switch to view
function createcharfromint(num) {
    var arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
    var view = new DataView(arr);
    view.setUint32(0, num, true); // byteOffset = 0; litteEndian = true
    return convertArrayBufferToString(arr);
}
// closes a connection, since the connection must be closed from the server, it sends a message to the server to close the connection
function closeConnection(websocket) {
    var prot = String.fromCharCode(0, 0, 0, 0, 126, 0, 0, 1);
    var encodedata = "q\0";
    var message = prot + encodedata;
    sendMessage(websocket, message);
}
// this function sends a message to the websocket to request reverting connection
function revertConnection(websocket) {
    var prot = String.fromCharCode(0, 0, 0, 0, 126, 0, 0, 1);
    var encodedata = "r\0";
    var message = prot + encodedata;
    sendMessage(websocket, message);
}
function convertArrayBufferToString(buffer) {
    var uint8View = new Uint8Array(buffer);
    var array = Array.from(uint8View);
    return String.fromCharCode.apply(String, array);
}
// it prints the received object on the console
function printBuffer(buffer) {
    if (buffer.byteLength > 8) {
        console.log("handling bottle");
        console.log(handleBottle(buffer));
    }
    else {
        console.log("head " + convertArrayBufferToString(buffer));
        // header data0000~D01
    }
}
// the callback to log the message received from the websocket
function logMessage(data) {
    data.data.arrayBuffer().then((buffer) => (printBuffer(buffer)));
}
// this parse the response when a query /portname message is sent and returns the obtained ip and port
function parseQueryPortNameResponseFromNameserver(buffer) {
    var response = handleBottle(buffer);
    response["value"][1];
    if (getKeyValue("value")(response)[1]["value"][0]["value"].toString() == "error") {
        console.log("port does not exists");
        return { "ip": "", "port": "" };
    }
    var bottleItem = getKeyValue("value")(response);
    var ip;
    var port;
    for (var x in bottleItem) {
        var type = getKeyValue("type")(bottleItem[x]);
        var value = getKeyValue("value")(bottleItem[x]);
        if (type == bottleTags.BOTTLE_TAG_LIST
            || type == (bottleTags.BOTTLE_TAG_LIST + bottleTags.BOTTLE_TAG_STRING)) {
            var elementName = value[0]["value"];
            var elementValue = value[1]["value"];
            if (elementName == "ip") {
                ip = elementValue;
            }
            else if (elementName == "port_number") {
                port = elementValue;
            }
        }
    }
    return { "ip": ip, "port": port };
}
// this function parse the response from the nameserver, and if the response is positive it establishes a new connection to receive data
function checkIfPortExistsAndConnect(buffer) {
    var responseFromNameserver = parseQueryPortNameResponseFromNameserver(buffer);
    var ip = responseFromNameserver["ip"];
    var port = responseFromNameserver["port"];
    var url = "ws://" + ip + ":" + port + "?ws";
    console.log("the url to connect to is: " + url);
    var newWebsocket = connectToYarp(url);
    if (newWebsocket) {
        newWebsocket.onmessage = logMessage;
        revertConnection(newWebsocket);
    }
    else {
        console.error("newWebsocket: " + url + "is undefined, check previous error");
    }
    return newWebsocket;
}
// this function handles the response of the query request
function handleAddressResponse(data) {
    data.data.arrayBuffer()
        .then((buffer) => checkIfPortExistsAndConnect(buffer));
}
// connects to yarp with the given url (TODO FIXME STE maybe it can be done only with ip and port?)
function connectToYarp(url) {
    var websocket;
    try {
        websocket = new WebSocket(url);
    }
    catch (error) {
        console.error("websocket client: " + url + " - " + error);
    }
    return websocket;
}
// sends a message over the websocket to request the ip and the port of portName
function sendQueryMessage(websocket, portName) {
    var msg = createBottleFromString("bot query " + portName);
    sendMessage(websocket, msg);
}
// sends a message to the websocket passed to request ip and port number of the yarp port name passed.
// then it returns the ip and the port received.
// if closeWebsocket = true then closes the connection to the websocket after the message is read
function getPortAndIp(websocket, portName, closeWebsocket = false) {
    var promise = new Promise((resolve) => {
        var handler = function (data) {
            data.data.arrayBuffer()
                .then((buffer) => resolve(parseQueryPortNameResponseFromNameserver(buffer)));
            if (closeWebsocket) {
                closeConnection(websocket);
            }
        };
        websocket.onmessage = handler;
        sendQueryMessage(websocket, portName);
    });
    return promise;
}
// sends a message to the websocket passed to request ip and port number of the yarp port name passed.
// then it creates a new websocket to connect to the port.
// if closeWebsocket = true then closes the connection to the websocket after the connection with the new port is established
function setupNewConnectionToPort(websocket, portName, closeWebsocket = false) {
    var promise = new Promise((resolve) => {
        var handler = function (data) {
            data.data.arrayBuffer()
                .then((buffer) => checkIfPortExistsAndConnect(buffer))
                .then((newWebsocket) => { resolve(newWebsocket); });
            if (closeWebsocket) {
                closeConnection(websocket);
            }
        };
        websocket.onmessage = handler;
        sendQueryMessage(websocket, portName);
    });
    return promise;
}
function setupNewConnectionToPortWithAddress(rootip, rootport, portName) {
    var websocket = connectToYarp("ws://" + rootip + ":" + rootport + "?ws");
    if (websocket) {
        return setupNewConnectionToPort(websocket, portName, true);
    }
    else {
        console.error("cannot connect to websocket " + portName);
    }
}
function getPortAndIpWithAddress(rootip, rootport, portName) {
    var websocket = connectToYarp("ws://" + rootip + ":" + rootport + "?ws");
    if (websocket) {
        return getPortAndIp(websocket, portName, true);
    }
    else {
        console.error("cannot connect to websocket " + portName);
    }
}
