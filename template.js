const sendHttpRequest = require('sendHttpRequest');
const getAllEventData = require('getAllEventData');
const JSON = require('JSON');
const encodeUriComponent = require('encodeUriComponent');
const getRequestHeader = require('getRequestHeader');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const getTimestampMillis = require('getTimestampMillis');
const generateRandom = require('generateRandom');
const makeTableMap = require('makeTableMap');
const makeString = require('makeString');
const sha256Sync = require('sha256Sync');
const getType = require('getType');

const eventData = getAllEventData();

const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = isLoggingEnabled ? getRequestHeader('trace-id') : undefined;

let eventDataOverride = {};
if (data.serverEventDataList) eventDataOverride = makeTableMap(data.serverEventDataList, 'name', 'value');

let url = 'https://wt1.rqtrk.eu?pid=' + enc(data.pid) +
    '&cb=' + getTimestampMillis() + generateRandom(1, 1000000000) +
    '&type=' + enc(data.type) +
    '&src=' + enc(eventDataOverride.src ? eventDataOverride.src : 'www') +
    '&sid=' + enc(eventDataOverride.sid ? eventDataOverride.sid : '1') +
    '&uid=' + enc(eventDataOverride.uid ? eventDataOverride.uid : eventData.client_id) +
    '&url=' + enc(eventDataOverride.url ? eventDataOverride.url : (eventData.page_location || getRequestHeader('referer')))
;

if (data.content) {
    url += '&content=' + enc(hashData(data.content));
}

if (isLoggingEnabled) {
    logToConsole(JSON.stringify({
        'Name': 'RoqAd',
        'Type': 'Request',
        'TraceId': traceId,
        'EventName': eventData.event_name,
        'RequestMethod': 'GET',
        'RequestUrl': url,
    }));
}

sendHttpRequest(url, (statusCode, headers, body) => {
    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'RoqAd',
            'Type': 'Response',
            'TraceId': traceId,
            'EventName': eventData.event_name,
            'ResponseStatusCode': statusCode,
            'ResponseHeaders': headers,
            'ResponseBody': body,
        }));
    }

    if (statusCode >= 200 && statusCode < 300) {
        data.gtmOnSuccess();
    } else {
        data.gtmOnFailure();
    }
});

function isHashed(value) {
    if (!value) {
        return false;
    }

    return makeString(value).match('^[A-Fa-f0-9]{64}$') !== null;
}

function hashData(value) {
    if (!value) {
        return value;
    }

    const type = getType(value);

    if (type === 'undefined' || value === 'undefined') {
        return undefined;
    }

    if (isHashed(value)) {
        return value;
    }

    return sha256Sync(makeString(value).trim().toLowerCase(), {outputEncoding: 'hex'});
}

function enc(data) {
    data = data || '';
    return encodeUriComponent(data);
}

function determinateIsLoggingEnabled() {
    const containerVersion = getContainerVersion();
    const isDebug = !!(
        containerVersion &&
        (containerVersion.debugMode || containerVersion.previewMode)
    );

    if (!data.logType) {
        return isDebug;
    }

    if (data.logType === 'no') {
        return false;
    }

    if (data.logType === 'debug') {
        return isDebug;
    }

    return data.logType === 'always';
}
