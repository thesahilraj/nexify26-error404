/*
 * ============================================================
 *  🌿 FARM NODE — ESP32-C6 Mini
 * ============================================================
 *
 *  SENSORS:
 *    - DHT11         → GPIO 4  (Temperature + Humidity)
 *    - Moisture Sensor → GPIO 0  (Analog, Capacitive)
 *    - MQ7 Gas Sensor → GPIO 1  (Analog, CO detection)
 *    - LED (Pump Sim) → GPIO 8  (Built-in LED on C6 Mini)
 *
 *  WIRING:
 *    ┌──────────────────────────────────────────────────┐
 *    │  ESP32-C6 Mini                                   │
 *    │                                                  │
 *    │  GPIO 4  ──── DHT11 DATA pin                     │
 *    │               (also connect 10kΩ pull-up          │
 *    │                from DATA to 3.3V)                │
 *    │                                                  │
 *    │  GPIO 0  ──── Moisture Sensor AO (Analog Out)    │
 *    │                                                  │
 *    │  GPIO 1  ──── MQ7 Sensor AO (Analog Out)         │
 *    │                                                  │
 *    │  GPIO 8  ──── Built-in LED (no wiring needed!)   │
 *    │               OR external LED + 220Ω to GND      │
 *    │                                                  │
 *    │  3.3V    ──── VCC on all sensors                 │
 *    │  GND     ──── GND on all sensors                 │
 *    └──────────────────────────────────────────────────┘
 *
 *  ARDUINO IDE SETTINGS:
 *    Board:  "ESP32C6 Dev Module"  (or "LOLIN C6 Mini")
 *    USB CDC On Boot:  "Enabled"
 *    Upload Speed:  921600
 *    Port:  COM15
 *
 *  LIBRARIES (install via Library Manager):
 *    1. "DHT sensor library" by Adafruit
 *    2. "Adafruit Unified Sensor" by Adafruit
 *
 * ============================================================
 */

#include "DHT.h"

// ── Pin Definitions ──
#define DHT_PIN       4
#define DHT_TYPE      DHT11
#define MOISTURE_PIN  0    // ADC1_CH0
#define GAS_PIN       1    // ADC1_CH1
#define LED_PIN       8    // Built-in LED on C6 Mini

// ── Sensor Object ──
DHT dht(DHT_PIN, DHT_TYPE);

// ── State ──
bool pumpState = false;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 2000;  // 2 seconds

// ── Last known good values (fallback if read fails) ──
float lastTemp = 0;
float lastHumidity = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);  // Give USB CDC time to initialize

  // Initialize DHT11
  dht.begin();

  // Initialize LED pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);  // OFF (active LOW on C6 Mini)

  // Boot message
  Serial.println("{\"status\":\"boot\",\"device\":\"farm-esp32c6\"}");
}

void loop() {
  // ── Handle Serial Commands ──
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "PUMP_ON") {
      pumpState = true;
      Serial.println("{\"ack\":\"PUMP_ON\"}");
    }
    else if (cmd == "PUMP_OFF") {
      pumpState = false;
      digitalWrite(LED_PIN, HIGH);  // OFF (active LOW)
      Serial.println("{\"ack\":\"PUMP_OFF\"}");
    }
  }

  // ── LED Pump Simulation (blink when ON) ──
  if (pumpState) {
    // Blink every 500ms for visual feedback
    bool ledOn = (millis() / 500) % 2 == 0;
    digitalWrite(LED_PIN, ledOn ? LOW : HIGH);  // Active LOW
  }

  // ── Read Sensors Every 2 Seconds ──
  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;

    // Read DHT11
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();

    // Use last known values if read fails
    if (!isnan(temp)) lastTemp = temp;
    if (!isnan(humidity)) lastHumidity = humidity;

    // Read Moisture Sensor (Capacitive)
    // Typical range: ~4095 in air (dry), ~1500 in water (wet)
    int moistureRaw = analogRead(MOISTURE_PIN);
    int moisturePct = map(moistureRaw, 4095, 1500, 0, 100);
    moisturePct = constrain(moisturePct, 0, 100);

    // Read MQ7 Gas Sensor
    // Higher value = more CO gas detected
    int gasRaw = analogRead(GAS_PIN);
    int gasLevel = map(gasRaw, 0, 4095, 0, 1000);
    gasLevel = constrain(gasLevel, 0, 1000);

    // ── Output JSON ──
    Serial.print("{\"temp\":");
    Serial.print(lastTemp, 1);
    Serial.print(",\"humidity\":");
    Serial.print(lastHumidity, 1);
    Serial.print(",\"moisture\":");
    Serial.print(moisturePct);
    Serial.print(",\"moistureRaw\":");
    Serial.print(moistureRaw);
    Serial.print(",\"gas\":");
    Serial.print(gasLevel);
    Serial.print(",\"gasRaw\":");
    Serial.print(gasRaw);
    Serial.print(",\"pump\":");
    Serial.print(pumpState ? "true" : "false");
    Serial.print(",\"uptime\":");
    Serial.print(now / 1000);
    Serial.println("}");
  }
}
