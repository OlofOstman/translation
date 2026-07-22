#include "soil.h"

#include <Adafruit_ADS1X15.h>

static Adafruit_ADS1115 ads;
static bool adsPresent = false;

bool soilInit() {
  // GAIN_ONE = +/-4.096 V full scale; a 3.3 V-powered sensor stays in range.
  ads.setGain(GAIN_ONE);
  adsPresent = ads.begin(I2C_ADDR_ADS1115);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SOIL_5, ADC_11db);
  analogSetPinAttenuation(PIN_SOIL_6, ADC_11db);
  return adsPresent;
}

bool soilAdsPresent() { return adsPresent; }

int soilReadRawOnce(SoilChannel ch) {
  switch (ch) {
    case ADS_A0:
    case ADS_A1:
    case ADS_A2:
    case ADS_A3:
      if (!adsPresent) return -1;
      return ads.readADC_SingleEnded((uint8_t)ch);
    case ESP_GPIO34:
      return analogRead(PIN_SOIL_5);
    case ESP_GPIO35:
      return analogRead(PIN_SOIL_6);
  }
  return -1;
}

static bool isAdsChannel(SoilChannel ch) { return ch <= ADS_A3; }

// Median of the collected samples (average of middle two for even counts).
static int medianOf(int* samples, int n) {
  for (int i = 1; i < n; i++) {
    int v = samples[i], j = i - 1;
    while (j >= 0 && samples[j] > v) { samples[j + 1] = samples[j]; j--; }
    samples[j + 1] = v;
  }
  if (n % 2 == 1) return samples[n / 2];
  return (samples[n / 2 - 1] + samples[n / 2]) / 2;
}

SoilReading soilRead(const PlantSensorConfig& cfg) {
  SoilReading r = {-1, -1.0f, "ok"};

  if (!cfg.enabled) {
    r.status = "disabled";
    return r;
  }
  if (isAdsChannel(cfg.channel) && !adsPresent) {
    r.status = "ads_missing";
    return r;
  }

  int samples[SOIL_SAMPLES_PER_READING];
  int count = 0;
  for (int i = 0; i < SOIL_SAMPLES_PER_READING; i++) {
    int raw = soilReadRawOnce(cfg.channel);
    if (raw >= 0) samples[count++] = raw;
    if (i < SOIL_SAMPLES_PER_READING - 1) delay(SOIL_SAMPLE_SPACING_MS);
  }
  if (count == 0) {
    r.status = "disconnected";
    return r;
  }

  r.raw = medianOf(samples, count);

  const int lo = isAdsChannel(cfg.channel) ? ADS_RAW_MIN_PLAUSIBLE : ESP_ADC_RAW_MIN_PLAUSIBLE;
  const int hi = isAdsChannel(cfg.channel) ? ADS_RAW_MAX_PLAUSIBLE : ESP_ADC_RAW_MAX_PLAUSIBLE;
  if (r.raw < lo || r.raw > hi) {
    r.status = "disconnected";
    return r;
  }

  if (cfg.raw_dry == cfg.raw_wet) {
    r.status = "invalid_calibration";
    return r;
  }

  // Linear map raw -> percent. Works whether the sensor reads higher or
  // lower when wet, because the sign of (raw_wet - raw_dry) flips too.
  float pct = 100.0f * (float)(r.raw - cfg.raw_dry) / (float)(cfg.raw_wet - cfg.raw_dry);
  r.percent = constrain(pct, 0.0f, 100.0f);
  return r;
}
