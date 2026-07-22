# Additional Components

## Genuinely required before assembly

| Item | Why | Skip if |
|---|---|---|
| Soldering iron + solder | ADS1115/BH1750/BME280 breakouts usually ship with **unsoldered** header pins; unsoldered pins in a breadboard cause intermittent I2C failures | all your modules arrived with headers already soldered |
| USB **data** cable (micro-USB for DevKit V1) | charge-only cables power the board but can't flash it | your listed cable is confirmed to carry data |

That's it — everything else needed for the MVP is already in your hardware
list. In particular, you do **not** need external I2C pull-up resistors
(the breakouts have them onboard), a separate 3.3 V regulator, or a level
shifter (everything runs at 3.3 V).

## Worth having (not required)

| Item | Why |
|---|---|
| Multimeter | fastest way to find a broken dupont wire or verify 3.3 V at a sensor |
| Extra dupont wires (male–female) | soil sensor leads rarely reach the pots from the enclosure; extensions are usually needed |
| Zip ties + adhesive anchors | strain relief inside the enclosure (Phase 5) |
| Heat-shrink or electrical tape | protecting soil-sensor cable joints near the pots |
| Nail polish or conformal coating | sealing the exposed electronics edge of the soil sensors against splashes |

## Explicitly out of scope

- **LILYGO T-Higrow** — separate experiment, not part of this build.
- Pumps/valves — this version is monitoring-only.
- Backend/app hardware — the firmware only needs *any* HTTP endpoint to
  POST to; a laptop running `python3 -m http.server 8080` is enough for
  testing.
