#include "payload.h"

#include <ArduinoJson.h>

String buildPayload(const EnvReading& env,
                    const SoilReading soil[],
                    const String& timestamp,
                    int wifiRssi) {
  JsonDocument doc;

  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = timestamp;

  JsonObject e = doc["environment"].to<JsonObject>();
  if (env.bme280_ok) {
    e["temperature_c"] = serialized(String(env.temperature_c, 1));
    e["humidity_percent"] = serialized(String(env.humidity_percent, 1));
    e["pressure_hpa"] = serialized(String(env.pressure_hpa, 1));
  } else {
    e["temperature_c"] = nullptr;
    e["humidity_percent"] = nullptr;
    e["pressure_hpa"] = nullptr;
  }
  if (env.bh1750_ok) {
    e["light_lux"] = serialized(String(env.light_lux, 0));
  } else {
    e["light_lux"] = nullptr;
  }

  JsonArray plants = doc["plants"].to<JsonArray>();
  for (size_t i = 0; i < PLANT_COUNT; i++) {
    const PlantSensorConfig& cfg = PLANTS[i];
    const SoilReading& r = soil[i];
    JsonObject p = plants.add<JsonObject>();
    p["plant_id"] = cfg.plant_id;
    p["name"] = cfg.name;
    p["sensor_channel"] = soilChannelName(cfg.channel);
    if (r.raw >= 0) {
      p["moisture_raw"] = r.raw;
    } else {
      p["moisture_raw"] = nullptr;
    }
    if (r.percent >= 0.0f) {
      p["moisture_percent"] = serialized(String(r.percent, 1));
    } else {
      p["moisture_percent"] = nullptr;
    }
    p["status"] = r.status;
  }

  doc["wifi_rssi"] = wifiRssi;
  doc["firmware_version"] = FIRMWARE_VERSION;

  String out;
  serializeJson(doc, out);
  return out;
}
