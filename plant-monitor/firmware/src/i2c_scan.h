#pragma once

#include <Arduino.h>
#include <Wire.h>

#include "config.h"

// Scans the I2C bus, prints every responding address and checks off the
// devices this project expects. Used by both the hwtest and station builds.
inline void i2cScanAndReport() {
  Serial.println(F("--- I2C scan (SDA=21, SCL=22) ---"));
  bool foundAds = false, foundBh = false, foundBme = false;
  int found = 0;
  for (uint8_t addr = 0x08; addr <= 0x77; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      found++;
      const char* label = "unknown device";
      if (addr == I2C_ADDR_ADS1115) { label = "ADS1115 (soil ADC)"; foundAds = true; }
      else if (addr == I2C_ADDR_BH1750) { label = "BH1750 (light)"; foundBh = true; }
      else if (addr == I2C_ADDR_BME280_PRIMARY || addr == I2C_ADDR_BME280_ALT) {
        label = "BME280 (temp/humidity)"; foundBme = true;
      }
      Serial.printf("  0x%02X  %s\n", addr, label);
    }
  }
  if (found == 0) {
    Serial.println(F("  No I2C devices found! Check SDA/SCL wiring, 3.3V and GND."));
  }
  Serial.printf("  ADS1115: %s   BH1750: %s   BME280: %s\n",
                foundAds ? "OK" : "MISSING",
                foundBh ? "OK" : "MISSING",
                foundBme ? "OK" : "MISSING");
  Serial.println(F("---------------------------------"));
}
