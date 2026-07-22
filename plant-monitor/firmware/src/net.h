#pragma once

#include <Arduino.h>

// Connects to Wi-Fi (blocking, with timeout). Returns true when connected.
bool netConnectWiFi();

// Reconnects if the connection dropped. Safe to call every cycle.
bool netEnsureWiFi();

// Starts SNTP time sync. Call once after the first Wi-Fi connection.
void netStartTimeSync();

// Local ISO-8601 timestamp like "2026-07-22T14:30:00+02:00".
// Returns "unsynced" until NTP has provided a valid time.
String netIsoTimestamp();

// POSTs a JSON body to API_ENDPOINT with retries and backoff.
// Returns true on any 2xx response.
bool netPostJson(const String& body);

int netRssi();
