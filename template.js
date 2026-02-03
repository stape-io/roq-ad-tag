const encodeUriComponent = require('encodeUriComponent');
const generateRandom = require('generateRandom');
const getAllEventData = require('getAllEventData');
const getContainerVersion = require('getContainerVersion');
const getRequestHeader = require('getRequestHeader');
const getTimestampMillis = require('getTimestampMillis');
const getType = require('getType');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeString = require('makeString');
const makeTableMap = require('makeTableMap');
const sendHttpRequest = require('sendHttpRequest');
const sha256Sync = require('sha256Sync');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired(data, eventData)) {
  return data.gtmOnSuccess();
}

const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = isLoggingEnabled ? getRequestHeader('trace-id') : undefined;

let eventDataOverride = {};
if (data.serverEventDataList)
  eventDataOverride = makeTableMap(data.serverEventDataList, 'name', 'value');

let url =
  'https://wt1.rqtrk.eu?pid=' +
  enc(data.pid) +
  '&cb=' +
  getTimestampMillis() +
  generateRandom(1, 1000000000) +
  '&type=' +
  enc(data.type) +
  '&src=' +
  enc(eventDataOverride.src ? eventDataOverride.src : 'www') +
  '&sid=' +
  enc(eventDataOverride.sid ? eventDataOverride.sid : '1') +
  '&uid=' +
  enc(eventDataOverride.uid ? eventDataOverride.uid : eventData.client_id) +
  '&url=' +
  enc(
    eventDataOverride.url
      ? eventDataOverride.url
      : eventData.page_location || getRequestHeader('referer')
  );
if (data.content) {
  url += '&content=' + enc(hashData(data.content));
}

if (isLoggingEnabled) {
  logToConsole(
    JSON.stringify({
      Name: 'RoqAd',
      Type: 'Request',
      TraceId: traceId,
      EventName: eventData.event_name,
      RequestMethod: 'GET',
      RequestUrl: url
    })
  );
}

sendHttpRequest(url, (statusCode, headers, body) => {
  if (isLoggingEnabled) {
    logToConsole(
      JSON.stringify({
        Name: 'RoqAd',
        Type: 'Response',
        TraceId: traceId,
        EventName: eventData.event_name,
        ResponseStatusCode: statusCode,
        ResponseHeaders: headers,
        ResponseBody: body
      })
    );
  }

  if (statusCode >= 200 && statusCode < 300) {
    data.gtmOnSuccess();
  } else {
    data.gtmOnFailure();
  }
});

/*==============================================================================
Helpers
==============================================================================*/

function isConsentGivenOrNotRequired() {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

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

  return sha256Sync(makeString(value).trim().toLowerCase(), {
    outputEncoding: 'hex'
  });
}

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
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
