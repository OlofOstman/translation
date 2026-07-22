#include "env_sensors.h"

#include <Adafruit_BME280.h>
#include <BH1750.h>
#include <Wire.h>

#include "config.h"

static BH1750 lightMeter(I2C_ADDR_BH1750);
static Adafruit_BME280 bme;
static bool bhPresent = false;
static bool bmePresent = false;

void envInit() {
  bhPresent = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, I2C_ADDR_BH1750, &Wire);
  if (!bhPresent) {
    Serial.println(F("[env] BH1750 not found at 0x23 - light readings unavailable"));
  }

  bmePresent = bme.begin(I2C_ADDR_BME280_PRIMARY, &Wire);
  if (!bmePresent) bmePresent = bme.begin(I2C_ADDR_BME280_ALT, &Wire);
  if (!bmePresent) {
    Serial.println(F("[env] BME280 not found at 0x76/0x77 - temp/humidity unavailable"));
  }
}

bool envBh1750Present() { return bhPresent; }
bool envBme280Present() { return bmePresent; }

EnvReading envRead() {
  EnvReading r = {bhPresent, bmePresent, -1.0f, NAN, NAN, NAN};

  if (bhPresent) {
    float lux = lightMeter.readLightLevel();
    if (lux < 0) {
      r.bh1750_ok = false; // read error this cycle
    } else {
      r.light_lux = lux;
    }
  }

  if (bmePresent) {
    r.temperature_c = bme.readTemperature();
    r.humidity_percent = bme.readHumidity();
    r.pressure_hpa = bme.readPressure() / 100.0f;
    if (isnan(r.temperature_c) || isnan(r.humidity_percent)) {
      r.bme280_ok = false;
    }
  }
  return r;
}
