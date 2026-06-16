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

// Define 4 servo objects
Servo servo1;
Servo servo2;
Servo servo3;
Servo servo4;

unsigned long lastDHTReadTime = 0;
const long dhtInterval = 2000; // 2 seconds

// Servo default angles (Neutral, Active)
const int angleNeutral = 90;
const int angleActive = 170; // Adjusted from 180 to 170 for better reliability

void setup() {
  Serial.begin(9600);
  dht.begin();

  // 5V 2A 전원이 있으므로 상시 연결하여 강력한 토크 유지
  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  servo3.attach(SERVO3_PIN);
  servo4.attach(SERVO4_PIN);
  
  // 초기 위치 중립으로 설정
  servo1.write(angleNeutral);
  servo2.write(angleNeutral);
  servo3.write(angleNeutral);
  servo4.write(angleNeutral);
  delay(500);
}

// Helper function to safely move a servo (Power saving detach removed for stability)
void executeMove(Servo &s, int pin, int targetAngle) {
  // s.attach(pin); // Already attached in setup for better response
  s.write(targetAngle);
  delay(1000); // Give enough time to push the switch
  s.write(angleNeutral);
  delay(800);  // Give time to return to neutral
  // s.detach(); // Removed to maintain holding torque and prevent "ziing" sound
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

  // Check for Serial Commands (Keep original structure)
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

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
