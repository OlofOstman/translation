#include "net.h"

#include <HTTPClient.h>
#include <WiFi.h>
#include <time.h>

#include "config.h"
#include "secrets.h"

bool netConnectWiFi() {
  Serial.printf("[wifi] connecting to \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected, IP %s, RSSI %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    return true;
  }
  Serial.println(F("[wifi] connection FAILED - will retry next cycle"));
  return false;
}

bool netEnsureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.println(F("[wifi] not connected, reconnecting..."));
  WiFi.disconnect();
  return netConnectWiFi();
}

void netStartTimeSync() {
  configTzTime(TZ_INFO, NTP_SERVER_1, NTP_SERVER_2);
  Serial.println(F("[time] NTP sync started"));
}

String netIsoTimestamp() {
  struct tm t;
  if (!getLocalTime(&t, 100)) return String("unsynced");
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S%z", &t);
  // strftime gives "+0200"; insert the colon for ISO-8601 "+02:00".
  String ts(buf);
  if (ts.length() >= 5) ts = ts.substring(0, ts.length() - 2) + ":" + ts.substring(ts.length() - 2);
  return ts;
}

bool netPostJson(const String& body) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[http] skipped upload - no Wi-Fi"));
    return false;
  }

  uint32_t backoff = HTTP_RETRY_BACKOFF_MS;
  for (int attempt = 1; attempt <= HTTP_RETRY_COUNT; attempt++) {
    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);
    if (!http.begin(API_ENDPOINT)) {
      Serial.println(F("[http] invalid API_ENDPOINT URL"));
      return false;
    }
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(body);
    http.end();

    if (code >= 200 && code < 300) {
      Serial.printf("[http] upload OK (%d)\n", code);
      return true;
    }
    Serial.printf("[http] attempt %d/%d failed: %s\n", attempt, HTTP_RETRY_COUNT,
                  code > 0 ? String(code).c_str() : HTTPClient::errorToString(code).c_str());
    if (attempt < HTTP_RETRY_COUNT) {
      delay(backoff);
      backoff *= 2;
    }
  }
  Serial.println(F("[http] upload failed - payload dropped, measurements continue"));
  return false;
}

int netRssi() {
  return WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
}
