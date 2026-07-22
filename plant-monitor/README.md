# ESP32 Multi-Plant Monitor

Monitors up to six indoor plants: individual soil moisture per plant, plus
shared ambient light, temperature, humidity and pressure. Every 15 minutes
(configurable) it prints one JSON payload to serial and POSTs it over Wi-Fi
to a configurable HTTP endpoint. Monitoring only — no automatic watering.

## Hardware

- ESP32 DevKit V1 (ESP32-WROOM-32)
- 6 × capacitive soil-moisture sensors — 4 via an **ADS1115** 16-bit I2C
  ADC (A0–A3), 2 directly on ESP32 ADC1 pins **GPIO34/GPIO35**
- **BH1750** light sensor + **BME280** temp/humidity/pressure, sharing the
  I2C bus (SDA=GPIO21, SCL=GPIO22)
- Everything powered from 3.3 V

See [docs/wiring.md](docs/wiring.md) for the exact pin table and diagram,
[docs/assembly.md](docs/assembly.md) for step-by-step bring-up, and
[docs/components.md](docs/components.md) for what else you need (short list).

## Firmware

Two PlatformIO build environments in [firmware/](firmware/):

| Env | Purpose | Needs secrets.h |
|---|---|---|
| `hwtest` | Phase 1: I2C scan + live raw readings from every sensor, with serial commands for testing and calibration | no |
| `station` | Full firmware: median-smoothed readings, per-sensor calibration, JSON payload, Wi-Fi + NTP + HTTP upload with retries | yes |

### Quick start

```bash
# install PlatformIO CLI once:  pip install platformio
cd plant-monitor/firmware

# Phase 1 - verify hardware first (no Wi-Fi config needed)
pio run -e hwtest -t upload && pio device monitor

# then for the full firmware:
cp include/secrets.example.h include/secrets.h   # fill in Wi-Fi + endpoint
pio run -e station -t upload && pio device monitor
```

All user configuration lives in two files:

- `firmware/include/config.h` — plant names, sensor calibration
  (`raw_dry`/`raw_wet` per sensor), measurement interval, timezone,
  device id. **The shipped calibration values are placeholders** — replace
  them using the procedure in docs/assembly.md.
- `firmware/include/secrets.h` — Wi-Fi credentials and API endpoint
  (git-ignored; copy from `secrets.example.h`).

### Payload format

```json
{
  "device_id": "plant-station-01",
  "timestamp": "2026-07-22T14:30:00+02:00",
  "environment": {
    "temperature_c": 22.4,
    "humidity_percent": 46.2,
    "pressure_hpa": 1013.1,
    "light_lux": 840
  },
  "plants": [
    {
      "plant_id": "plant_1",
      "name": "Monstera",
      "sensor_channel": "ads1115_a0",
      "moisture_raw": 16420,
      "moisture_percent": 43.5,
      "status": "ok"
    }
  ],
  "wifi_rssi": -58,
  "firmware_version": "0.1.0"
}
```

Per-plant `status` values: `ok`, `disabled`, `disconnected`,
`invalid_calibration`, `ads_missing`. Missing environment sensors report
`null` fields. The device reports measurements only — plant-care logic
belongs in the future backend/app.

## Design notes

- **ADC2 is never used** for soil sensors (GPIO34/35 are ADC1) because
  ADC2 conflicts with Wi-Fi.
- Each soil reading is the **median of 10 samples** taken over ~1.5 s;
  implausible values mark the sensor `disconnected` instead of producing
  garbage percentages.
- Calibration maps raw → 0–100 % and is clamped; it works whether a
  sensor's raw value rises or falls with moisture.
- A failed upload is retried with backoff, then dropped — Wi-Fi or server
  failures never stop local measurements, and Wi-Fi reconnects
  automatically each cycle.
- Configuration (including calibration) is compiled into the firmware, so
  reboots and power loss can't lose it.

## MVP acceptance checklist

- [ ] Six soil sensors individually identified (hwtest table + damp-hand test)
- [ ] Four ADS1115 channels and GPIO34/35 all reading
- [ ] Light, temperature and humidity measured
- [ ] Every sensor has real `raw_dry`/`raw_wet` values in config.h
- [ ] One JSON payload printed and POSTed every 15 minutes
- [ ] Wi-Fi off → measurements continue; Wi-Fi back → uploads resume
- [ ] Reboot keeps configuration (compiled-in — automatic)
- [ ] Serial log clearly shows sensor and connection status

## Out of scope for this version

Backend/app and plant-care recommendations, automatic watering, and the
LILYGO T-Higrow (separate experiment).
