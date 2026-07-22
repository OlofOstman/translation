# Assembly & Bring-Up Guide

Work through this top to bottom. Each step verifies the previous one, so a
wiring mistake is caught immediately instead of after everything is built.

## 0. Before you start

- **Check header pins.** ADS1115, BH1750 and BME280 breakouts often ship
  with loose header pins. If the pins are not soldered, solder them now —
  breadboard contact through unsoldered pins is unreliable and causes
  intermittent I2C failures that are miserable to debug.
- Use the **breadboard** for everything below. Move to the expansion board
  only in step 7.
- Confirm your USB cable carries data (some charge-only cables don't):
  plugging the ESP32 in should create a serial port on your computer.

## 1. Flash the hardware-test firmware (no wiring yet)

```bash
cd plant-monitor/firmware
pio run -e hwtest -t upload
pio device monitor
```

You should see the startup banner and an I2C scan reporting
`No I2C devices found` — correct, nothing is connected yet.

## 2. I2C devices, one at a time

Unplug USB before changing wiring, then follow [wiring.md](wiring.md).

1. Wire the **ADS1115** (VDD→3V3, GND→GND, SDA→GPIO21, SCL→GPIO22,
   ADDR→GND). Power up, press `s` in the serial monitor: it should appear
   at `0x48`.
2. Add the **BH1750**. Rescan: `0x23` appears. The table should show a lux
   value that rises when you shine a phone light on it.
3. Add the **BME280**. Rescan: `0x76` or `0x77` appears. Temperature and
   humidity should look like your room; breathe on the sensor and humidity
   should jump.

If a device is missing: check 3.3 V and GND first, then SDA/SCL (the most
common error is swapping them), then the header soldering.

## 3. Four-plant prototype (Phase 2)

1. Wire soil sensors 1–4: VCC→3V3, GND→GND, AOUT→ADS1115 A0–A3 in plant
   order.
2. In the serial monitor, the four ADS channels now show raw values.
   Grip a sensor's sensing area with a damp hand — its value should move
   clearly. Confirm each physical sensor maps to the channel you expect
   (this is the plant↔sensor mapping).
3. Values should sit roughly in the 8000–22000 range and be stable within
   a few hundred counts. A wildly jumping or near-zero value means a bad
   AOUT connection.

## 4. Six-plant version (Phase 3)

1. Add soil sensors 5 and 6: AOUT→GPIO34 and GPIO35.
2. Their raw values use the ESP32's own 12-bit ADC, so the numbers are
   smaller (roughly 1000–3500) — that's expected; they get their own
   calibration values.

## 5. Calibration (per sensor — they all differ)

For each plant, one at a time:

1. In the serial monitor press the plant number (`1`–`6`) to stream just
   that channel.
2. Push the sensor into **dry** potting soil up to (not past) the marked
   line. Wait ~30 s, note the stable value → this is `raw_dry`.
3. Water the pot thoroughly and let excess water drain (10–15 min).
4. Note the stable value → this is `raw_wet`.
5. Enter both values in the plant's row in `firmware/include/config.h`,
   along with the real plant name.

Capacitive sensors read **lower when wet** — that's fine, the firmware
handles either direction. If a plant slot has no sensor yet, set its
`enabled` flag to `false`.

Re-flash after editing config. Calibration lives in the compiled config, so
it survives reboots and power loss.

## 6. Network integration (Phase 4)

1. Create your secrets file and fill in Wi-Fi credentials and the endpoint:
   ```bash
   cp include/secrets.example.h include/secrets.h
   ```
2. Flash the full firmware:
   ```bash
   pio run -e station -t upload
   pio device monitor
   ```
3. Verify in the serial log: Wi-Fi connects, the timestamp is real
   (not `unsynced`), a full JSON payload prints, and the upload either
   succeeds or fails gracefully with a retry log.
4. Pull out one sensor's AOUT wire and wait for the next cycle: that plant
   should report `"status": "disconnected"` while everything else keeps
   working. Turn off your router: measurements must continue with uploads
   skipped, and resume when Wi-Fi returns.

No endpoint yet? Run a quick local receiver on your computer to see the
POSTs arrive:

```bash
python3 -m http.server 8080   # logs each POST request; or use webhook.site
```

## 7. Enclosure (Phase 5)

Do this only after everything above works.

- Move the ESP32 and ADS1115 connections from the breadboard to the
  **expansion board**; keep the same pins, use dupont wires or solder for
  reliability.
- **ESP32 + ADS1115 inside** the enclosure.
- **BH1750 outside** or under a clear window — it must see the same light
  as the plants, not the inside of an opaque box.
- **BME280 outside** the box in free room air, and away from the ESP32 —
  the ESP32 runs a few degrees warm and will bias the temperature reading.
- Soil sensors: only the sensing blade goes in the soil, **never past the
  line below the electronics**. Keep the PCB top and cable connector above
  the soil and away from watering splashes.
- Add strain relief where cables enter the enclosure (a zip tie anchored
  inside works), and route soil-sensor cables so drips can't run down into
  the box.
- Re-run one full cycle in the serial monitor after the move to confirm
  nothing shifted.
