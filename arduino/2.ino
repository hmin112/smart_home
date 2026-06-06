#include <IRremote.hpp>

// HC-SR04 Pins
#define TRIG_PIN 2
#define ECHO_PIN 4

// KY-005 IR Transmitter Pin
#define IR_SEND_PIN 3

unsigned long lastSonarReadTime = 0;
const long sonarInterval = 100; // 0.1 seconds

void setup() {
  Serial.begin(9600);
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  IrSender.begin(IR_SEND_PIN);
}

void loop() {
  unsigned long currentMillis = millis();

  // Read HC-SR04 every 0.1 seconds
  if (currentMillis - lastSonarReadTime >= sonarInterval) {
    lastSonarReadTime = currentMillis;

    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout after 30ms
    if (duration > 0) {
      float distance = duration * 0.034 / 2;
      Serial.print("D:");
      Serial.println(distance);
    }
  }

  // Check for Serial Commands for IR
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    // Map command to IR RAW data
    // Protocol: 6 (NEC), Address: 88 (0x88)
    
    uint16_t address = 0x88;
    
    if (command == "AC_POWER_ON_COOL_18") { IrSender.sendNEC(address, 0xC005, 1); }
    else if (command == "AC_POWER_ON_HEAT_26") { IrSender.sendNEC(address, 0x04B4, 1); }
    else if (command == "AC_POWER_COOL") { IrSender.sendNEC(address, 0x1008, 1); }
    else if (command == "AC_COOL_18") { IrSender.sendNEC(address, 0x0834, 1); }
    else if (command == "AC_COOL_19") { IrSender.sendNEC(address, 0x0844, 1); }
    else if (command == "AC_COOL_20") { IrSender.sendNEC(address, 0x0854, 1); }
    else if (command == "AC_COOL_21") { IrSender.sendNEC(address, 0x0864, 1); }
    else if (command == "AC_COOL_22") { IrSender.sendNEC(address, 0x0874, 1); }
    else if (command == "AC_COOL_23") { IrSender.sendNEC(address, 0x0884, 1); }
    else if (command == "AC_COOL_24") { IrSender.sendNEC(address, 0x0894, 1); }
    else if (command == "AC_COOL_25") { IrSender.sendNEC(address, 0x08A4, 1); }
    else if (command == "AC_COOL_26") { IrSender.sendNEC(address, 0x08B4, 1); }
    else if (command == "AC_COOL_27") { IrSender.sendNEC(address, 0x08C4, 1); }
    else if (command == "AC_HEAT_23") { IrSender.sendNEC(address, 0x0C84, 1); }
    else if (command == "AC_HEAT_24") { IrSender.sendNEC(address, 0x0C94, 1); }
    else if (command == "AC_HEAT_25") { IrSender.sendNEC(address, 0x0CA4, 1); }
    else if (command == "AC_HEAT_26") { IrSender.sendNEC(address, 0x0CB4, 1); }
    else if (command == "AC_HEAT_27") { IrSender.sendNEC(address, 0x0CC4, 1); }
    else if (command == "AC_HEAT_28") { IrSender.sendNEC(address, 0x0CD4, 1); }
    else if (command == "AC_HEAT_29") { IrSender.sendNEC(address, 0x0CE4, 1); }
    else if (command == "AC_HEAT_30") { IrSender.sendNEC(address, 0x0CF4, 1); }
  }
}
