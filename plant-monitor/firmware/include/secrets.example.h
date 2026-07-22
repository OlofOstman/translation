#pragma once

// Copy this file to include/secrets.h and fill in your real values.
// secrets.h is git-ignored so credentials never end up in the repository.
//
//   cp include/secrets.example.h include/secrets.h

#define WIFI_SSID     "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"

// HTTP endpoint that receives the JSON payload via POST.
// Leave as-is until you have a backend; upload failures are logged and
// skipped without stopping measurements.
#define API_ENDPOINT  "http://192.168.1.100:8080/api/readings"
