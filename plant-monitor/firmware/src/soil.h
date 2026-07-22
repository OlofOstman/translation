#pragma once

#include <Arduino.h>

#include "config.h"

struct SoilReading {
  int         raw;      // median raw value (-1 if unreadable)
  float       percent;  // calibrated 0-100, -1 if not computable
  const char* status;   // "ok", "disabled", "disconnected",
                        // "invalid_calibration", "ads_missing"
};

// Initialises the ADS1115 and the ESP32 ADC1 pins.
// Returns true if the ADS1115 responded. Call after Wire.begin().
bool soilInit();

bool soilAdsPresent();

// Single raw sample from one channel (no smoothing). -1 on failure.
int soilReadRawOnce(SoilChannel ch);

// Full reading for one configured plant: SOIL_SAMPLES_PER_READING samples
// over ~1.5 s, median-combined, range-checked and calibrated to percent.
SoilReading soilRead(const PlantSensorConfig& cfg);
