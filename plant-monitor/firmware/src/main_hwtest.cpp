// Phase 1: hardware bring-up firmware.
//
// Scans the I2C bus on boot, reports which expected devices are present,
// then continuously prints raw readings from every sensor so each one can
// be identified and verified independently. No Wi-Fi, no secrets.h needed.
//
// Serial commands (115200 baud):
//   s    re-scan the I2C bus
//   1-6  stream a single soil channel fast (use this to capture
//        calibration values for that plant)
//   a    back to the all-sensors table
//   h    help

#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "env_sensors.h"
#include "i2c_scan.h"
#include "soil.h"

static int focusPlant = -1; // -1 = show everything
static uint32_t lastPrint = 0;

static void printHelp() {
  Serial.println(F("Commands: s=I2C rescan, 1-6=stream one soil channel, a=all sensors, h=help"));
}

static void printAll() {
  Serial.println();
  Serial.println(F("Soil sensors (raw values):"));
  for (size_t i = 0; i < PLANT_COUNT; i++) {
    const PlantSensorConfig& p = PLANTS[i];
    int raw = soilReadRawOnce(p.channel);
    if (raw < 0) {
      Serial.printf("  %u. %-10s %-10s  UNAVAILABLE (ADS1115 missing?)\n",
                    (unsigned)(i + 1), p.name, soilChannelName(p.channel));
    } else {
      Serial.printf("  %u. %-10s %-10s  raw=%d\n",
                    (unsigned)(i + 1), p.name, soilChannelName(p.channel), raw);
    }
  }

  EnvReading env = envRead();
  Serial.println(F("Environment:"));
  if (env.bh1750_ok) {
    Serial.printf("  light: %.1f lux\n", env.light_lux);
  } else {
    Serial.println(F("  light: BH1750 unavailable"));
  }
  if (env.bme280_ok) {
    Serial.printf("  temperature: %.2f C   humidity: %.1f %%   pressure: %.1f hPa\n",
                  env.temperature_c, env.humidity_percent, env.pressure_hpa);
  } else {
    Serial.println(F("  temp/humidity: BME280 unavailable"));
  }
}

static void printFocus() {
  const PlantSensorConfig& p = PLANTS[focusPlant];
  int raw = soilReadRawOnce(p.channel);
  Serial.printf("[%s / %s on %s] raw=%d\n",
                p.plant_id, p.name, soilChannelName(p.channel), raw);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println(F("=== Plant Monitor - Phase 1 hardware test ==="));
  Serial.printf("firmware %s, device %s\n", FIRMWARE_VERSION, DEVICE_ID);

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  i2cScanAndReport();

  if (!soilInit()) {
    Serial.println(F("[soil] ADS1115 init FAILED - plants 1-4 unavailable"));
  } else {
    Serial.println(F("[soil] ADS1115 ready (gain +/-4.096 V)"));
  }
  envInit();
  printHelp();
}

void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 's') {
      i2cScanAndReport();
    } else if (c >= '1' && c <= '6') {
      focusPlant = c - '1';
      Serial.printf("Streaming %s - press 'a' to stop\n", PLANTS[focusPlant].name);
    } else if (c == 'a') {
      focusPlant = -1;
    } else if (c == 'h') {
      printHelp();
    }
  }

  uint32_t interval = (focusPlant >= 0) ? 300 : 2000;
  if (millis() - lastPrint >= interval) {
    lastPrint = millis();
    if (focusPlant >= 0) {
      printFocus();
    } else {
      printAll();
    }
  }
}
