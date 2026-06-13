#include <Servo.h>
#include <DHT.h>

// Pins (Keep all original pins)
#define DHTPIN 6
#define DHTTYPE DHT11

// Servos for Light 1
#define SERVO1_PIN 2 // ON
#define SERVO2_PIN 3 // OFF

// Servos for Light 2
#define SERVO3_PIN 8 // ON
#define SERVO4_PIN 9 // OFF

DHT dht(DHTPIN, DHTTYPE);

// We define 4 servo objects but will attach/detach them dynamically to save power
Servo servo1;
Servo servo2;
Servo servo3;
Servo servo4;

unsigned long lastDHTReadTime = 0;
const long dhtInterval = 2000; // 2 seconds

// Servo default angles (Neutral, Active)
const int angleNeutral = 90;
const int angleActive = 180;

void setup() {
  Serial.begin(9600);
  dht.begin();

  // We do not attach at setup to keep power consumption at 0
}

// Helper function to safely move a servo and detach it immediately
void executeMove(Servo &s, int pin, int targetAngle) {
  s.attach(pin);
  s.write(targetAngle);
  delay(600); // Give time to reach physical switch
  s.write(angleNeutral);
  delay(500); // Give time to return to neutral
  s.detach(); // Completely kill power to this motor
}

void loop() {
  unsigned long currentMillis = millis();

  // Read DHT every 2 seconds (Keep original logic)
  if (currentMillis - lastDHTReadTime >= dhtInterval) {
    lastDHTReadTime = currentMillis;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (!isnan(h) && !isnan(t)) {
      Serial.print("T:");
      Serial.print(t);
      Serial.print(",H:");
      Serial.println(h);
    }
  }

  // Check for Serial Commands (Enhanced with power-saving logic)
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    // Use executeMove to ensure only one motor pulls current at a time
    if (command == "LIGHT1_ON") {
      executeMove(servo1, SERVO1_PIN, angleActive);
    }
    else if (command == "LIGHT1_OFF") {
      executeMove(servo2, SERVO2_PIN, angleActive);
    }
    else if (command == "LIGHT2_ON") {
      executeMove(servo3, SERVO3_PIN, angleActive);
    }
    else if (command == "LIGHT2_OFF") {
      executeMove(servo4, SERVO4_PIN, angleActive);
    }
  }
}
