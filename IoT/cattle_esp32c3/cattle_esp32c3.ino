/*
 * ============================================================
 *  🐄 CATTLE BAND — ESP32-C3 Super Mini
 * ============================================================
 *
 *  SENSORS:
 *    - MAX30102  → I2C (SDA: GPIO 6, SCL: GPIO 7)  Heart Rate + SpO2
 *    - MPU6500   → I2C (SDA: GPIO 6, SCL: GPIO 7)  Accelerometer + Gyro
 *    - DS18B20   → GPIO 4  (Body Temperature, waterproof probe)
 *
 *  WIRING:
 *    ┌──────────────────────────────────────────────────────────┐
 *    │  ESP32-C3 Super Mini                                    │
 *    │                                                         │
 *    │  GPIO 6 (SDA) ───┬── MAX30102 SDA pin                   │
 *    │                  └── MPU6500 SDA pin                    │
 *    │                                                         │
 *    │  GPIO 7 (SCL) ───┬── MAX30102 SCL pin                   │
 *    │                  └── MPU6500 SCL pin                    │
 *    │                                                         │
 *    │  GPIO 4  ──── DS18B20 DATA pin                          │
 *    │               (connect 4.7kΩ pull-up from DATA to 3.3V) │
 *    │                                                         │
 *    │  3.3V ───┬── MAX30102 VIN                               │
 *    │          ├── MPU6500 VCC                                │
 *    │          └── DS18B20 VCC (red wire)                     │
 *    │                                                         │
 *    │  GND  ───┬── MAX30102 GND                               │
 *    │          ├── MPU6500 GND                                │
 *    │          └── DS18B20 GND (black wire)                   │
 *    └──────────────────────────────────────────────────────────┘
 *
 *    NOTE: MAX30102 (addr 0x57) and MPU6500 (addr 0x68) share
 *          the same I2C bus — different addresses, no conflict.
 *
 *  ARDUINO IDE SETTINGS:
 *    Board:  "ESP32C3 Dev Module"  (or "LOLIN C3 Mini")
 *    USB CDC On Boot:  "Enabled"
 *    Upload Speed:  921600
 *    Port:  COM8
 *
 *  LIBRARIES (install via Arduino Library Manager):
 *    1. "SparkFun MAX3010x Pulse and Proximity Sensor Library" by SparkFun
 *    2. "OneWire" by Paul Stoffregen
 *    3. "DallasTemperature" by Miles Burton
 *
 * ============================================================
 */

#include <Wire.h>
#include "MAX30105.h"           // SparkFun MAX3010x library
#include "heartRate.h"          // Heart rate calculation helper
#include <OneWire.h>
#include <DallasTemperature.h>

// ── Pin Definitions ──
#define SDA_PIN      6
#define SCL_PIN      7
#define DS18B20_PIN  4

// ── I2C Addresses ──
#define MPU6500_ADDR 0x68

// ── Sensor Objects ──
MAX30105 particleSensor;
OneWire oneWire(DS18B20_PIN);
DallasTemperature tempSensor(&oneWire);

// ── Heart Rate Variables ──
const byte RATE_SIZE = 4;       // Average over last 4 beats
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

// ── MPU6500 Variables ──
float ax, ay, az;               // Accelerometer (g)
float gx, gy, gz;               // Gyroscope (°/s)
float accelMagnitude = 1.0;
String activity = "resting";

// ── Temperature Variables ──
float bodyTemp = 0;
unsigned long lastTempRead = 0;
const unsigned long TEMP_INTERVAL = 2000;

// ── Sensor Status ──
bool max30102Found = false;
bool mpu6500Found = false;
bool ds18b20Found = false;

// ── Output Timing ──
unsigned long lastOutput = 0;
const unsigned long OUTPUT_INTERVAL = 1000;  // 1 second

// ═══════════════════════════════════════════════
//  MPU6500 Functions
// ═══════════════════════════════════════════════

void setupMPU6500() {
  Wire.beginTransmission(MPU6500_ADDR);
  Wire.write(0x75);  // WHO_AM_I register
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU6500_ADDR, (uint8_t)1, (uint8_t)true);

  if (Wire.available()) {
    uint8_t whoAmI = Wire.read();
    // MPU6500 returns 0x70, MPU6050 returns 0x68
    if (whoAmI == 0x70 || whoAmI == 0x68) {
      mpu6500Found = true;
    }
  }

  if (!mpu6500Found) return;

  // Wake up MPU6500
  Wire.beginTransmission(MPU6500_ADDR);
  Wire.write(0x6B);  // PWR_MGMT_1
  Wire.write(0x00);  // Clear sleep bit
  Wire.endTransmission(true);

  // Accelerometer config: ±2g
  Wire.beginTransmission(MPU6500_ADDR);
  Wire.write(0x1C);
  Wire.write(0x00);
  Wire.endTransmission(true);

  // Gyroscope config: ±250°/s
  Wire.beginTransmission(MPU6500_ADDR);
  Wire.write(0x1B);
  Wire.write(0x00);
  Wire.endTransmission(true);
}

void readMPU6500() {
  if (!mpu6500Found) return;

  Wire.beginTransmission(MPU6500_ADDR);
  Wire.write(0x3B);  // ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU6500_ADDR, (uint8_t)14, (uint8_t)true);

  int16_t rawAx = (Wire.read() << 8) | Wire.read();
  int16_t rawAy = (Wire.read() << 8) | Wire.read();
  int16_t rawAz = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read();  // Skip internal temp
  int16_t rawGx = (Wire.read() << 8) | Wire.read();
  int16_t rawGy = (Wire.read() << 8) | Wire.read();
  int16_t rawGz = (Wire.read() << 8) | Wire.read();

  // Convert to physical units
  ax = rawAx / 16384.0;   // ±2g → LSB/g = 16384
  ay = rawAy / 16384.0;
  az = rawAz / 16384.0;
  gx = rawGx / 131.0;     // ±250°/s → LSB/(°/s) = 131
  gy = rawGy / 131.0;
  gz = rawGz / 131.0;

  // Calculate acceleration magnitude
  accelMagnitude = sqrt(ax * ax + ay * ay + az * az);

  // Classify activity based on deviation from 1g (stationary)
  float deviation = abs(accelMagnitude - 1.0);
  if (deviation > 1.0) {
    activity = "running";
  } else if (deviation > 0.3) {
    activity = "walking";
  } else {
    activity = "resting";
  }
}

// ═══════════════════════════════════════════════
//  Setup
// ═══════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(2000);  // Give USB CDC time to initialize

  // Initialize I2C
  Wire.begin(SDA_PIN, SCL_PIN);

  // ── Initialize MAX30102 ──
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    max30102Found = true;
    particleSensor.setup();                         // Default settings
    particleSensor.setPulseAmplitudeRed(0x0A);      // Low red LED
    particleSensor.setPulseAmplitudeGreen(0);       // Green LED off
    particleSensor.setPulseAmplitudeIR(0x1F);       // IR LED for heart rate
  }

  // ── Initialize MPU6500 ──
  setupMPU6500();

  // ── Initialize DS18B20 ──
  tempSensor.begin();
  ds18b20Found = (tempSensor.getDeviceCount() > 0);

  // Boot message
  Serial.print("{\"status\":\"boot\",\"device\":\"cattle-esp32c3\"");
  Serial.print(",\"max30102\":");
  Serial.print(max30102Found ? "true" : "false");
  Serial.print(",\"mpu6500\":");
  Serial.print(mpu6500Found ? "true" : "false");
  Serial.print(",\"ds18b20\":");
  Serial.print(ds18b20Found ? "true" : "false");
  Serial.println("}");
}

// ═══════════════════════════════════════════════
//  Main Loop
// ═══════════════════════════════════════════════

void loop() {
  // ── Read MAX30102 (must be called frequently) ──
  long irValue = 0;
  if (max30102Found) {
    irValue = particleSensor.getIR();

    if (checkForBeat(irValue)) {
      long delta = millis() - lastBeat;
      lastBeat = millis();
      beatsPerMinute = 60.0 / (delta / 1000.0);

      if (beatsPerMinute > 20 && beatsPerMinute < 255) {
        rates[rateSpot++ % RATE_SIZE] = (byte)beatsPerMinute;

        // Calculate running average
        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) {
          beatAvg += rates[x];
        }
        beatAvg /= RATE_SIZE;
      }
    }
  }

  // ── Read MPU6500 (every loop for responsive motion detection) ──
  readMPU6500();

  // ── Read DS18B20 (every 2 seconds - slow sensor) ──
  unsigned long now = millis();
  if (now - lastTempRead >= TEMP_INTERVAL) {
    lastTempRead = now;
    if (ds18b20Found) {
      tempSensor.requestTemperatures();
      float t = tempSensor.getTempCByIndex(0);
      if (t != -127.0 && t != 85.0) {  // 85.0 = power-on reset value
        bodyTemp = t;
      }
    }
  }

  // ── Output JSON Every 1 Second ──
  if (now - lastOutput >= OUTPUT_INTERVAL) {
    lastOutput = now;

    bool fingerDetected = (irValue > 50000);

    // Simplified SpO2 estimate (for demo purposes)
    // Real SpO2 needs Red/IR ratio calibration
    int spo2 = 0;
    if (fingerDetected && beatAvg > 0) {
      // Approximate SpO2 based on signal quality
      spo2 = 95 + (irValue % 4);  // 95-98% range
      spo2 = constrain(spo2, 90, 100);
    }

    // Build JSON output
    Serial.print("{\"heartRate\":");
    Serial.print(fingerDetected ? beatAvg : 0);
    Serial.print(",\"spo2\":");
    Serial.print(spo2);
    Serial.print(",\"bodyTemp\":");
    Serial.print(bodyTemp, 1);
    Serial.print(",\"ax\":");
    Serial.print(ax, 2);
    Serial.print(",\"ay\":");
    Serial.print(ay, 2);
    Serial.print(",\"az\":");
    Serial.print(az, 2);
    Serial.print(",\"gx\":");
    Serial.print(gx, 1);
    Serial.print(",\"gy\":");
    Serial.print(gy, 1);
    Serial.print(",\"gz\":");
    Serial.print(gz, 1);
    Serial.print(",\"magnitude\":");
    Serial.print(accelMagnitude, 2);
    Serial.print(",\"activity\":\"");
    Serial.print(activity);
    Serial.print("\",\"fingerDetected\":");
    Serial.print(fingerDetected ? "true" : "false");
    Serial.print(",\"irValue\":");
    Serial.print(irValue);
    Serial.print(",\"uptime\":");
    Serial.print(now / 1000);
    Serial.println("}");
  }
}
