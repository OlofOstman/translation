#pragma once

#include <Arduino.h>

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------
#define DEVICE_ID        "plant-station-01"
#define FIRMWARE_VERSION "0.1.0"

// ---------------------------------------------------------------------------
// Pins and I2C addresses
// ---------------------------------------------------------------------------
constexpr int PIN_I2C_SDA = 21;
constexpr int PIN_I2C_SCL = 22;

// Soil sensors 5 and 6 must stay on ADC1 pins (GPIO32-39):
// ADC2 pins cannot be used while Wi-Fi is active.
constexpr int PIN_SOIL_5 = 34;
constexpr int PIN_SOIL_6 = 35;

constexpr uint8_t I2C_ADDR_ADS1115        = 0x48; // ADDR pin -> GND
constexpr uint8_t I2C_ADDR_BH1750         = 0x23; // ADDR pin floating/GND
constexpr uint8_t I2C_ADDR_BME280_PRIMARY = 0x76; // both are probed at startup
constexpr uint8_t I2C_ADDR_BME280_ALT     = 0x77;

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------
constexpr uint32_t MEASUREMENT_INTERVAL_MS = 15UL * 60UL * 1000UL; // 15 minutes

// Per soil sensor: N samples spread over ~1.5 s, combined with the median.
constexpr int      SOIL_SAMPLES_PER_READING = 10;
constexpr uint32_t SOIL_SAMPLE_SPACING_MS   = 150;

// Plausible raw windows used to flag disconnected/shorted soil sensors.
// ADS1115 at GAIN_ONE: 4.096 V full scale = 32767 counts, so a 3.3 V-powered
// sensor can never legitimately reach the values outside this window.
constexpr int ADS_RAW_MIN_PLAUSIBLE = 3000;   // ~0.37 V
constexpr int ADS_RAW_MAX_PLAUSIBLE = 27000;  // ~3.37 V
// ESP32 ADC1, 12-bit, 11 dB attenuation. A floating pin reads near 0.
constexpr int ESP_ADC_RAW_MIN_PLAUSIBLE = 200;
constexpr int ESP_ADC_RAW_MAX_PLAUSIBLE = 4050;

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------
constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 20000;
constexpr uint32_t HTTP_TIMEOUT_MS         = 10000;
constexpr int      HTTP_RETRY_COUNT        = 3;
constexpr uint32_t HTTP_RETRY_BACKOFF_MS   = 2000; // doubles after each attempt

#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.google.com"
// POSIX TZ string for local timestamps. Default: Europe/Stockholm (CET/CEST).
#define TZ_INFO "CET-1CEST,M3.5.0,M10.5.0/3"

// ---------------------------------------------------------------------------
// Plant / soil sensor configuration
// ---------------------------------------------------------------------------
enum SoilChannel {
  ADS_A0 = 0,
  ADS_A1,
  ADS_A2,
  ADS_A3,
  ESP_GPIO34,
  ESP_GPIO35,
};

struct PlantSensorConfig {
  const char* plant_id;
  const char* name;
  SoilChannel channel;
  int  raw_dry;   // raw reading in dry soil
  int  raw_wet;   // raw reading in freshly watered, drained soil
  bool enabled;
};

// !!! CALIBRATION REQUIRED !!!
// The raw_dry/raw_wet values below are PLACEHOLDERS. Every sensor must be
// calibrated individually (see docs/assembly.md, "Calibration"). Both
// directions are supported: raw_wet may be smaller or larger than raw_dry.
// Capacitive sensors typically read LOWER when wet.
static const PlantSensorConfig PLANTS[] = {
  // plant_id   name        channel     raw_dry raw_wet enabled
  {"plant_1",  "Monstera",  ADS_A0,     21000,  10500,  true},
  {"plant_2",  "Basil",     ADS_A1,     22000,  11000,  true},
  {"plant_3",  "Plant 3",   ADS_A2,     21500,  10800,  true},
  {"plant_4",  "Plant 4",   ADS_A3,     21800,  10900,  true},
  {"plant_5",  "Plant 5",   ESP_GPIO34,  3100,   1450,  true},
  {"plant_6",  "Plant 6",   ESP_GPIO35,  3050,   1400,  true},
};
constexpr size_t PLANT_COUNT = sizeof(PLANTS) / sizeof(PLANTS[0]);

// Human-readable channel names used in logs and the JSON payload.
inline const char* soilChannelName(SoilChannel ch) {
  switch (ch) {
    case ADS_A0:     return "ads1115_a0";
    case ADS_A1:     return "ads1115_a1";
    case ADS_A2:     return "ads1115_a2";
    case ADS_A3:     return "ads1115_a3";
    case ESP_GPIO34: return "gpio34";
    case ESP_GPIO35: return "gpio35";
  }
  return "unknown";
}
