// Full monitoring firmware (Phases 2-4).
//
// Every MEASUREMENT_INTERVAL_MS: reads all six soil channels (median of 10
// samples each), light, temperature/humidity/pressure, builds one JSON
// payload, prints it to serial and POSTs it to API_ENDPOINT.
//
// Wi-Fi or server failures never stop local measurements: uploads are
// retried a few times, then the payload is dropped and the next cycle
// proceeds normally.
//
// Requires include/secrets.h - copy include/secrets.example.h.

#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "env_sensors.h"
#include "i2c_scan.h"
#include "net.h"
#include "payload.h"
#include "soil.h"

static uint32_t lastMeasurement = 0;
static bool firstCycleDone = false;

static void runMeasurementCycle() {
  Serial.println();
  Serial.println(F("=== measurement cycle ==="));

  SoilReading soil[PLANT_COUNT];
  for (size_t i = 0; i < PLANT_COUNT; i++) {
    soil[i] = soilRead(PLANTS[i]);
    Serial.printf("[soil] %-10s %-10s raw=%-6d moisture=%s%%  status=%s\n",
                  PLANTS[i].name, soilChannelName(PLANTS[i].channel), soil[i].raw,
                  soil[i].percent >= 0 ? String(soil[i].percent, 1).c_str() : "n/a",
                  soil[i].status);
  }

  EnvReading env = envRead();
  if (env.bme280_ok) {
    Serial.printf("[env] %.2f C, %.1f %% RH, %.1f hPa\n",
                  env.temperature_c, env.humidity_percent, env.pressure_hpa);
  }
  if (env.bh1750_ok) {
    Serial.printf("[env] %.0f lux\n", env.light_lux);
  }

  bool wifiOk = netEnsureWiFi();
  String payload = buildPayload(env, soil, netIsoTimestamp(), netRssi());
  Serial.println(F("[payload]"));
  Serial.println(payload);

  if (wifiOk) {
    netPostJson(payload);
  } else {
    Serial.println(F("[http] skipped upload - no Wi-Fi (measurements continue)"));
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println(F("=== Plant Monitor - station firmware ==="));
  Serial.printf("firmware %s, device %s, interval %lu min\n",
                FIRMWARE_VERSION, DEVICE_ID,
                (unsigned long)(MEASUREMENT_INTERVAL_MS / 60000UL));

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  i2cScanAndReport();

  if (!soilInit()) {
    Serial.println(F("[soil] ADS1115 init FAILED - plants 1-4 will report ads_missing"));
  }
  envInit();

  if (netConnectWiFi()) {
    netStartTimeSync();
  }
}

void loop() {
  if (!firstCycleDone || millis() - lastMeasurement >= MEASUREMENT_INTERVAL_MS) {
    lastMeasurement = millis();
    firstCycleDone = true;
    runMeasurementCycle();
  }
  delay(50);
}
