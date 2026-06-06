#include <Servo.h>
#include <DHT.h>

// Pins
#define DHTPIN 6
#define DHTTYPE DHT11

// Servos for Light 1
#define SERVO1_PIN 2 // ON
#define SERVO2_PIN 3 // OFF

// Servos for Light 2
#define SERVO3_PIN 8 // ON
#define SERVO4_PIN 9 // OFF

DHT dht(DHTPIN, DHTTYPE);

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

  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  servo3.attach(SERVO3_PIN);
  servo4.attach(SERVO4_PIN);

  // Initialize servos to neutral position
  resetServos();
}

void resetServos() {
  servo1.write(angleNeutral);
  servo2.write(angleNeutral);
  servo3.write(angleNeutral);
  servo4.write(angleNeutral);
  delay(500); // Give time to reach position
}

void loop() {
  unsigned long currentMillis = millis();

  // Read DHT every 2 seconds
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

  // Check for Serial Commands
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "LIGHT1_ON") {
      // Light 1 ON -> Servo 2 opposite (neutral), Servo 1 active
      servo2.write(angleNeutral);
      delay(200); // Sequential logic to avoid power drop
      servo1.write(angleActive);
      delay(500); // Wait for physical press
      servo1.write(angleNeutral); // Return to neutral
    }
    else if (command == "LIGHT1_OFF") {
      // Light 1 OFF -> Servo 1 opposite (neutral), Servo 2 active
      servo1.write(angleNeutral);
      delay(200);
      servo2.write(angleActive);
      delay(500);
      servo2.write(angleNeutral);
    }
    else if (command == "LIGHT2_ON") {
      // Light 2 ON -> Servo 4 opposite (neutral), Servo 3 active
      servo4.write(angleNeutral);
      delay(200);
      servo3.write(angleActive);
      delay(500);
      servo3.write(angleNeutral);
    }
    else if (command == "LIGHT2_OFF") {
      // Light 2 OFF -> Servo 3 opposite (neutral), Servo 4 active
      servo3.write(angleNeutral);
      delay(200);
      servo4.write(angleActive);
      delay(500);
      servo4.write(angleNeutral);
    }
  }
}
