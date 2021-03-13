function getRandomString(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function base64ToUint8Array(base64) {
    var binary_string = atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

function padZero(num) {
    return (num < 10 ? "0" : "") + num;
}

function getCurrentTime(now) {
    var res = "" + now.getFullYear() + padZero(now.getMonth() + 1) + padZero(now.getDate()) + padZero(now.getHours()) + 
        padZero(now.getMinutes()) + padZero(now.getSeconds());
    return res;
}

function decodeLineData(line_data) {
    return JSON.parse(new TextDecoder().decode(pako.inflate(base64ToUint8Array(line_data))));
}

function getLines(callback) {
    var now = new Date();
    timestamp = Math.floor(+now / 1000);
    request_id = '' + getCurrentTime(now) + getRandomString(8);
    hmac = hex(md51("Channel-No=HY&Request-Id=" + request_id + "&Sign-Type=MD5&Time-Stamp=" + timestamp + "1234567890")).toUpperCase();
    fetch('https://eroad.tuspass.net/api/v1/linedDatas?timeStamp=0&Time-Stamp=' + timestamp, {
        headers: {
            'Channel-No': 'HY',
            'Sign-Type': 'MD5',
            'Time-Stamp': '' + timestamp,
            'Request-Id': request_id,
            'hmac': hmac
        }
    }).then(response => response.json()).then(callback);
}

function getBuses(lineList, callback) {
    var now = new Date();
    timestamp = Math.floor(+now / 1000);
    request_id = '' + getCurrentTime(now) + getRandomString(8);
    hmac = hex(md51("Channel-No=HY&Request-Id=" + request_id + "&Sign-Type=MD5&Time-Stamp=" + timestamp + "1234567890")).toUpperCase();
    fetch('https://eroad.tuspass.net/api/v4/etas/' + lineList, {
        headers: {
            'Channel-No': 'HY',
            'Sign-Type': 'MD5',
            'Time-Stamp': '' + timestamp,
            'Request-Id': request_id,
            'hmac': hmac
        },
        referrer: "https://www.tuspass.com/"
    }).then(response => response.json()).then(callback);
}

function getStations(lineList, callback) {
    var now = new Date();
    timestamp = Math.floor(+now / 1000);
    request_id = '' + getCurrentTime(now) + getRandomString(8);
    hmac = hex(md51("Channel-No=HY&Request-Id=" + request_id + "&Sign-Type=MD5&Time-Stamp=" + timestamp + "1234567890")).toUpperCase();
    fetch('https://eroad.tuspass.net/api/v2/lines/' + lineList + '?Time-Stamp=1603685304&latitude=40&lineId=' + lineList + '&deviceId=0000000000000000&Request-Id=' + request_id + '&longitude=116', {
        headers: {
            'Channel-No': 'HY',
            'Sign-Type': 'MD5',
            'Time-Stamp': '' + timestamp,
            'Request-Id': request_id,
            'hmac': hmac
        }
    }).then(response => response.json()).then(callback);
}

requestCount = 0;
results = [];

function outputBuses(line_info, result, expectedCount) {
    for (const line of result.etas) {
        results.push(line);
    }
    requestCount += 1;
    if (requestCount == expectedCount) {
        results.sort(function (a, b) {
            return line_info[a.lineId][0].localeCompare(line_info[b.lineId][0], undefined, {numeric: true, sensitivity: 'base'});
        });

        window.parent.postMessage("Loading stations.json ...", '*');

        fetch('https://project-bjbus.github.io/stations.json').then(response => response.json()).then(function (stations) {
            outputString = '';
            for (const line of results) {
                outputString += "=" + line_info[line.lineId][0] + "-" + line_info[line.lineId][1] + "=\n";
                for (const bus of line.trips) {
                    outputString += "    " + bus.gpsId + " 距离 " + (bus.stationId in stations ? stations[bus.stationId] : bus.stationId) + " " + bus.distance + "米 位置 " + bus.x + 'E,' + bus.y + "N " + (bus.cd === undefined ? "" : "上座率 " + bus.cd.m + "/" + bus.cd.n) + "\n"; 
                }
            }
            window.parent.postMessage(outputString, '*');
        });
    } else {
        window.parent.postMessage("Loading " + requestCount + "/" + expectedCount + " ...", '*');
    }
}

function crawlLines(lineData) {
    fetch('https://project-bjbus.github.io/lines.json').then(response => response.json()).then(function (lines) {
        line_info = {};
        for (const line of lines) {
            line_info[line[0]] = [line[1], line[2]];
        }
        line_ids = Object.keys(line_info).sort(() => Math.random() - 0.5);
        requestCount = 0;
        for (i = 0; i < line_ids.length; i += 400) {
            getBuses(line_ids.slice(i, i + 400).join(","), x => outputBuses(line_info, x, Math.ceil(line_ids.length / 400)));
        }
    });
}