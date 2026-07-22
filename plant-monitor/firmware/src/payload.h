#pragma once

#include <Arduino.h>

#include "config.h"
#include "env_sensors.h"
#include "soil.h"

// Builds the JSON payload for one measurement cycle.
// `soil` must hold PLANT_COUNT entries, index-aligned with PLANTS.
String buildPayload(const EnvReading& env,
                    const SoilReading soil[],
                    const String& timestamp,
                    int wifiRssi);
