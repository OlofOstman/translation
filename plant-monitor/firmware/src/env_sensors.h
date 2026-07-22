#pragma once

#include <Arduino.h>

struct EnvReading {
  bool  bh1750_ok;
  bool  bme280_ok;
  float light_lux;
  float temperature_c;
  float humidity_percent;
  float pressure_hpa;
};

// Detects and initialises BH1750 and BME280. Call after Wire.begin().
// Missing devices are logged and their readings reported as unavailable;
// they never block the rest of the system.
void envInit();

bool envBh1750Present();
bool envBme280Present();

EnvReading envRead();
