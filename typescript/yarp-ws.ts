enum bottleTags{
 BOTTLE_TAG_INT8 = 32,         // 0000 0000 0010 0000
 BOTTLE_TAG_INT16 = 64,        // 0000 0000 0100 0000
 BOTTLE_TAG_INT32 = 1,         // 0000 0000 0000 0001
 BOTTLE_TAG_INT64 = (1 + 16),  // 0000 0000 0001 0001
 BOTTLE_TAG_VOCAB32 = (1 + 8), // 0000 0000 0000 1001
 BOTTLE_TAG_FLOAT32 = 128,     // 0000 0000 1000 0000
 BOTTLE_TAG_FLOAT64 = (2 + 8), // 0000 0000 0000 1010
 BOTTLE_TAG_STRING = (4),      // 0000 0000 0000 0100
 BOTTLE_TAG_BLOB = (4 + 8),    // 0000 0000 0000 1100
 BOTTLE_TAG_LIST = 256,        // 0000 0001 0000 0000
 BOTTLE_TAG_DICT = 512         // 0000 0010 0000 0000
}

var websocketList: WebSocket[] =[]

interface BottleItemWithType {
    length: number;
    type: bottleTags|string;
    value: any[]|string|number;
}

interface BottleItemWithoutType {
    type: bottleTags|string;
    value: any[]|string|number;
}

type BottleItem = BottleItemWithoutType|BottleItemWithType;

interface BottleAndBytesRead{
    bytesRead: number;
    bottle: BottleItem;
}
 const getKeyValue = <U extends keyof T, T extends object>(key: U) => (obj: T) =>
  obj[key];


const waitForOpenConnection = (socket:WebSocket) => {
    return new Promise<string>((resolve, reject) => {
        const maxNumberOfAttempts = 10
        const intervalTime = 200 //ms

        let currentAttempt = 0
        const interval = setInterval(() => {
            if (currentAttempt > maxNumberOfAttempts - 1) {
                clearInterval(interval)
                reject(new Error('Maximum number of attempts exceeded'))
            } else if (socket.readyState === socket.OPEN) {
                clearInterval(interval)
                resolve("ok")
            }
            currentAttempt++
        }, intervalTime)
    })
}

const sendMessage = async (socket:WebSocket, msg:string) => {
    if (socket.readyState !== socket.OPEN) {
        try {
            await waitForOpenConnection(socket)
            socket.send(msg)
        } catch (err) { console.error(err) }
    } else {
        socket.send(msg)
    }
}

function handleBottle(dataReceived:ArrayBuffer, startingPoint:number, nested:boolean, nestedType?:bottleTags): BottleAndBytesRead
{
    var view = new DataView(dataReceived, 0);

    var toReturn: BottleItem
    var bottleType
    var bytesRead = startingPoint
    if(nested) {
        bottleType = nestedType
    } else {
        bottleType = view.getInt32(bytesRead, true)
        bytesRead = bytesRead + 4
    }
    console.log("bottle type" + bottleType);
    console.log("starting point" + startingPoint);
    switch(bottleType) {
        case bottleTags.BOTTLE_TAG_INT8:
            var numberRead = view.getInt8(bytesRead)
            toReturn = {type: bottleTags.BOTTLE_TAG_INT8, value: numberRead}
            bytesRead = bytesRead + 1
            break
        case bottleTags.BOTTLE_TAG_INT16:
            var numberRead = view.getInt16(bytesRead, true)
            toReturn = {type: bottleTags.BOTTLE_TAG_INT16, value: numberRead}
            bytesRead = bytesRead + 2
            break
        case bottleTags.BOTTLE_TAG_INT32:
            var numberRead = view.getInt32(bytesRead, true)
            toReturn = {type: bottleTags.BOTTLE_TAG_INT32, value: numberRead}
            bytesRead = bytesRead + 4
            break
        case bottleTags.BOTTLE_TAG_INT64:
            console.log("BOTTLE_TAG_INT64 not implemented")
            toReturn = {type: "ERROR", value: "BOTTLE_TAG_INT64 not implemented"}
            break
        case bottleTags.BOTTLE_TAG_VOCAB32:
            var numberRead = view.getInt32(bytesRead, true)
            toReturn = {type: bottleTags.BOTTLE_TAG_VOCAB32, value: numberRead}
            bytesRead = bytesRead + 4
            break
        case bottleTags.BOTTLE_TAG_FLOAT32:
            var numberRead = view.getFloat32(bytesRead, true)
            toReturn = {type: bottleTags.BOTTLE_TAG_FLOAT32, value: numberRead}
            bytesRead = bytesRead + 4
            break
        case bottleTags.BOTTLE_TAG_FLOAT64:
            var numberRead = view.getFloat64(bytesRead, true)
            toReturn = {type: bottleTags.BOTTLE_TAG_FLOAT64, value: numberRead}
            bytesRead = bytesRead + 4
            break
        case bottleTags.BOTTLE_TAG_STRING:
            var itemLength = view.getInt32(bytesRead, true)
            bytesRead = bytesRead + 4
            toReturn = {type: bottleTags.BOTTLE_TAG_STRING, value: convertArrayBufferToString(dataReceived).substring(bytesRead, bytesRead + itemLength)}
            bytesRead = bytesRead + itemLength
            break
        case bottleTags.BOTTLE_TAG_BLOB:
            var itemLength = view.getInt32(bytesRead, true)
            bytesRead = bytesRead + 4
            toReturn = {type: bottleTags.BOTTLE_TAG_BLOB, value: convertArrayBufferToString(dataReceived).substring(bytesRead, bytesRead + itemLength)}
            bytesRead = bytesRead + itemLength
            break
        case bottleTags.BOTTLE_TAG_LIST:
            var listLength = view.getInt32(bytesRead, true)
            var listItems = []
            bytesRead = bytesRead + 4
            for (var i = 0; i < listLength; i++) {
                var item = handleBottle(dataReceived,bytesRead, false)
                bytesRead = bytesRead + item.bytesRead
                listItems.push(item.bottle)
            }
            toReturn = {type: bottleTags.BOTTLE_TAG_LIST, 
                        length: listLength,
                        value: listItems}
            break
            // TODO FIXME STE need to implement also LIST + INT and LIST + FLOAT?
        case bottleTags.BOTTLE_TAG_LIST + bottleTags.BOTTLE_TAG_STRING:
            var listLength = view.getInt32(bytesRead, true)
            var listItems = [];
            bytesRead = bytesRead + 4;
            for (var i = 0; i < listLength; i++) {
                var item = handleBottle(dataReceived, bytesRead, true, bottleTags.BOTTLE_TAG_STRING);
                bytesRead = bytesRead + item.bytesRead;
                listItems.push(item.bottle);
            }
            toReturn = { type: bottleTags.BOTTLE_TAG_LIST + bottleTags.BOTTLE_TAG_STRING,
                length: listLength,
                value: listItems };
            break;
        case bottleTags.BOTTLE_TAG_DICT: // TODO FIXME STE
            console.log("BOTTLE_TAG_DICT not implemented")
            toReturn = {type: "ERROR", value:"BOTTLE_TAG_DICT not implemented"}
            break
        default:
            console.log("bottle tag not known")
            toReturn = {type: "ERROR", value:"bottle tag not known"}
            break
    }
    return {bytesRead: bytesRead -startingPoint, bottle: toReturn}
}

function sendData(websocket:WebSocket, message:string)
{
    sendMessage(websocket,createBottleFromString(message))
}

function createBottleFromString(data:string)
{
    var prot = String.fromCharCode(0,0,0,0,126,0,0,1)
    var encodedata = "d\0"
    var bottletype = String.fromCharCode(4,0,0,0)
    var message = prot + encodedata + bottletype
    var items = data.split(" ")
    var bottlelength = createcharfromint(items.length)
    message = message.concat(bottlelength)
    for (var x in items)
    {
        if (items[x].length < 255)
        {
            var itemlength = String.fromCharCode(items[x].length,0,0,0)
            message = message.concat(itemlength + items[x])
        }
    }
    return message
}

function createcharfromint(num:number)
{
    var char1 = num %256
    num = num /256
    var char2 = num %256
    num = num /256
    var char3 = num %256
    num = num /256
    var char4 = num %256
    return String.fromCharCode(char1,char2,char3,char4)
}

function closeConnection(websocket:WebSocket)
{
    var prot = String.fromCharCode(0,0,0,0,126,0,0,1)
    var encodedata = "q\0"
    var message = prot + encodedata
    sendMessage(websocket, message)
}

function revertConnection(websocket:WebSocket)
{
    var prot = String.fromCharCode(0,0,0,0,126,0,0,1)
    var encodedata = "r\0"
    var message = prot + encodedata
    sendMessage(websocket, message)
}

function convertArrayBufferToString(buffer:ArrayBuffer){
    var uint8View = new Uint8Array(buffer);
    var array = Array.from(uint8View)
    return String.fromCharCode.apply(String,array)
}


function printBuffer(buffer:ArrayBuffer){

    if (buffer.byteLength > 8){
        console.log("handling bottle")
        console.log(handleBottle(buffer,
                                0,
                                false))
    } else {
        console.log("head " + convertArrayBufferToString(buffer))
        // header data0000~D01
    }
}

function logMessage(data:any){
    data.data.arrayBuffer().then((buffer:ArrayBuffer) => (printBuffer(buffer)))
}

function checkIfPortExistsAndConnect(buffer:ArrayBuffer){
    printBuffer(buffer)
    var response = handleBottle(buffer, 0, false)
    if ((<any[]>getKeyValue<keyof BottleItem, BottleItem>("value")(<BottleItemWithType>response.bottle))[1]["value"][0]["value"].toString() == "error") {
        console.log("port does not exists")
        return
    }
    var bottleItem = <any[]>getKeyValue<keyof BottleItem, BottleItem>("value")(<BottleItemWithType>response.bottle)
    var ip
    var port
    for (var x in bottleItem) {
        var type = getKeyValue<keyof BottleItem, BottleItem>("type")(<any>bottleItem[x])
        var value = getKeyValue<keyof BottleItem, BottleItem>("value")(<any>bottleItem[x])
        if( type == bottleTags.BOTTLE_TAG_LIST 
        || type == (bottleTags.BOTTLE_TAG_LIST + bottleTags.BOTTLE_TAG_STRING)) {
            var elementName = (<any[]>value)[0]["value"]
            var elementValue = (<any[]>value)[1]["value"]
            if (elementName == "ip") {
                ip = elementValue
            } else if (elementName == "port_number"){
                port = elementValue 
            }

        }
    }
    var url = "ws://" + ip + ":" + port + "?ws"
    console.log(url)
    connectToYarp(url);
    (<any[]>websocketList)[websocketList.length-1].onmessage = logMessage
    revertConnection((<any[]>websocketList)[websocketList.length-1])
}

function handleAddressResponse(data:any){
    data.data.arrayBuffer().then((buffer:ArrayBuffer) => checkIfPortExistsAndConnect(buffer))
}


function connectToYarp(url:string){
    var websocket = new WebSocket(url)
    websocketList.push(websocket)
}

function setupNewConnectionToPort(websocket: WebSocket, portName: String){
    websocket.onmessage = handleAddressResponse
    var msg = createBottleFromString("bot query " + portName)
    sendMessage(websocket, msg)
}



