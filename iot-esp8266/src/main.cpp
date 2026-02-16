#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <SocketIOclient.h>

// Ultrasonic sensor configuration
const int trigPin = 5;   // D1
const int echoPin = 4;   // D2

// Bin configuration - CALIBRATE THESE FOR YOUR BIN
const float binHeight = 50.0;       // Height of your bin in cm
const float emptyDistance = 5.0;    // Distance from sensor to bottom when empty
const int checkInterval = 10000;    // Check every 10 seconds (increased frequency)

// WiFi credentials
const char* ssid = "Harsh";
const char* password = "12345678";

// Server configuration - UPDATE WITH YOUR CORRECT IP
const char* serverHost = "192.168.153.223";  // Your computer's IP
const int serverPort = 5000;
const int httpPort = 5000;
const char* socketPath = "/socket.io/?EIO=4";

// Bin information
const String binId = "bin-001";
const String location = "Main Street Area";

SocketIOclient socketIO;
bool socketConnected = false;
bool notificationSent = false;
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 10000; // 10 seconds

// Real-time monitoring variables
unsigned long lastSuccessfulReading = 0;
int consecutiveFailures = 0;
const int maxConsecutiveFailures = 5;

// Function declarations
void connectToWiFi();
void setupSocketIO();
void sendRegistration();
void checkBinLevel();
void sendStatusUpdate(float fillLevel, float distance);
void sendSocketStatus(float fillLevel, float distance);
void sendHTTPStatus(float fillLevel, float distance);
void sendCriticalAlert(float fillLevel);
void testHTTPServer();
String getTimestamp();
float getFilteredDistance();
float getSingleDistance();
float calculateFillLevel(float distance);
void debugSensor();
void blinkLED();
void resetSystem();

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("🚀 GreenEye IoT Bin Monitoring System Starting...");
  
  // Initialize ultrasonic sensor
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  
  // Initialize built-in LED for status
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // LED OFF (inverted logic)
  
  // Test sensor first
  Serial.println("🎯 Initial sensor test...");
  debugSensor();
  
  connectToWiFi();
  setupSocketIO();
  
  Serial.println("✅ System Initialized Successfully");
  Serial.print("📡 IP Address: ");
  Serial.println(WiFi.localIP());
  lastSuccessfulReading = millis();
}

void loop() {
  socketIO.loop();
  blinkLED(); // Status LED blinking
  
  // Handle reconnection with exponential backoff
  if (!socketConnected && millis() - lastReconnectAttempt > reconnectInterval) {
    lastReconnectAttempt = millis();
    Serial.println("🔄 Attempting to reconnect...");
    setupSocketIO();
  }
  
  // Emergency reset if too many failures
  if (consecutiveFailures >= maxConsecutiveFailures * 2) {
    Serial.println("🚨 Too many consecutive failures, resetting system...");
    resetSystem();
  }
  
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck >= checkInterval) {
    checkBinLevel();
    lastCheck = millis();
  }
  
  delay(100);
}

void connectToWiFi() {
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  
  Serial.println("⏳ Waiting for connection...");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(1000);
    Serial.print(".");
    attempts++;
    
    if (attempts % 10 == 0) {
      Serial.println();
      Serial.print("⏰ Attempt ");
      Serial.print(attempts);
      Serial.println("/40");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("📶 SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("📡 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("🚀 Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("📶 Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    Serial.println("Please check WiFi credentials and router connection");
  }
}

void setupSocketIO() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Cannot connect Socket.io - No WiFi connection");
    return;
  }
  
  Serial.println("🔌 Connecting to GreenEye Server...");
  Serial.print("🌐 Server: ");
  Serial.print(serverHost);
  Serial.print(":");
  Serial.println(serverPort);
  
  // Test HTTP connection first
  testHTTPServer();
  
  socketIO.begin(serverHost, serverPort, socketPath);
  
  socketIO.onEvent([](socketIOmessageType_t type, uint8_t * payload, size_t length) {
    switch(type) {
      case sIOtype_DISCONNECT:
        Serial.println("❌ Disconnected from server");
        socketConnected = false;
        break;
      case sIOtype_CONNECT:
        Serial.println("✅ Connected to GreenEye server!");
        socketConnected = true;
        sendRegistration();
        break;
      case sIOtype_EVENT:
        {
          String message = (char*)payload;
          Serial.print("📨 Server message: ");
          Serial.println(message);
        }
        break;
      case sIOtype_ERROR:
        Serial.println("❌ Socket.io error");
        socketConnected = false;
        break;
      case sIOtype_ACK:
      case sIOtype_BINARY_EVENT:
      case sIOtype_BINARY_ACK:
        break;
    }
  });
  
  // Wait for connection with timeout
  unsigned long connectionStart = millis();
  while (!socketConnected && millis() - connectionStart < 10000) {
    socketIO.loop();
    delay(100);
  }
  
  if (!socketConnected) {
    Serial.println("❌ Socket.io connection timeout");
  }
}

void testHTTPServer() {
  Serial.println("🔍 Testing HTTP connection to server...");
  
  WiFiClient client;
  HTTPClient http;
  
  String testUrl = "http://" + String(serverHost) + ":" + String(httpPort) + "/api/health";
  
  Serial.print("🌐 Testing URL: ");
  Serial.println(testUrl);
  
  http.begin(client, testUrl);
  http.setTimeout(10000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("✅ HTTP Server is reachable!");
  } else if (httpCode > 0) {
    Serial.print("⚠️ HTTP Server responded with code: ");
    Serial.println(httpCode);
  } else {
    Serial.print("❌ HTTP Server not reachable. Error: ");
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
}

void sendRegistration() {
  if (!socketConnected) return;
  
  DynamicJsonDocument doc(200);
  JsonArray array = doc.to<JsonArray>();
  
  array.add("iot-register");
  
  JsonObject data = array.createNestedObject();
  data["binId"] = binId;
  data["location"] = location;
  data["type"] = "dustbin";
  data["capacity"] = binHeight;
  data["firmware"] = "2.0";
  data["ip"] = WiFi.localIP().toString();
  data["rssi"] = WiFi.RSSI();
  
  String output;
  serializeJson(doc, output);
  
  socketIO.sendEVENT(output);
  Serial.println("📝 Bin registration sent to server");
}

void checkBinLevel() {
  Serial.println("\n📊 Checking bin level...");
  
  float distance = getFilteredDistance();
  
  if (distance == -1) {
    consecutiveFailures++;
    Serial.println("❌ Invalid distance reading");
    Serial.print("🔢 Consecutive failures: ");
    Serial.println(consecutiveFailures);
    
    if (consecutiveFailures >= 3) {
      Serial.println("🔧 Running sensor diagnostics...");
      debugSensor();
    }
    return;
  }
  
  // Successful reading
  consecutiveFailures = 0;
  lastSuccessfulReading = millis();
  
  float fillLevel = calculateFillLevel(distance);
  
  Serial.print("📊 Bin Level: ");
  Serial.print(fillLevel);
  Serial.print("% | Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  
  // Send status update
  sendStatusUpdate(fillLevel, distance);
  
  // Real-time alert logic
  if (fillLevel >= 90 && !notificationSent) {
    sendCriticalAlert(fillLevel);
    notificationSent = true;
    Serial.println("🚨 CRITICAL: Bin 90% full - Alert sent!");
    
    // Blink LED rapidly for critical alert
    for(int i = 0; i < 10; i++) {
      digitalWrite(LED_BUILTIN, LOW);
      delay(200);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(200);
    }
  } 
  else if (fillLevel >= 70 && fillLevel < 90) {
    Serial.println("⚠️ WARNING: Bin 70% full");
    notificationSent = false;
    
    // Blink LED for warning
    digitalWrite(LED_BUILTIN, LOW);
    delay(500);
    digitalWrite(LED_BUILTIN, HIGH);
  } 
  else if (fillLevel < 70 && notificationSent) {
    notificationSent = false;
    Serial.println("✅ Alert reset - bin level decreased");
  }
  
  // System health monitoring
  Serial.print("💚 System Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" seconds");
  Serial.print("📶 WiFi Strength: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
}

void sendStatusUpdate(float fillLevel, float distance) {
  // Determine status based on fill level
  String status = "normal";
  if (fillLevel >= 90) status = "critical";
  else if (fillLevel >= 70) status = "warning";
  
  // Try Socket.io first (real-time)
  if (socketConnected) {
    sendSocketStatus(fillLevel, distance, status);
  } else {
    // Fallback to HTTP
    sendHTTPStatus(fillLevel, distance, status);
  }
}

void sendSocketStatus(float fillLevel, float distance, String status) {
  DynamicJsonDocument doc(200);
  JsonArray array = doc.to<JsonArray>();
  
  array.add("iot-status-update");
  
  JsonObject data = array.createNestedObject();
  data["binId"] = binId;
  data["location"] = location;
  data["fillLevel"] = fillLevel;
  data["distance"] = distance;
  data["status"] = status;
  data["timestamp"] = getTimestamp();
  data["rssi"] = WiFi.RSSI();
  data["uptime"] = millis() / 1000;
  
  String output;
  serializeJson(doc, output);
  
  socketIO.sendEVENT(output);
  Serial.println("📡 Status update sent via Socket.io");
}

void sendHTTPStatus(float fillLevel, float distance, String status) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Cannot send HTTP - No WiFi connection");
    return;
  }
  
  WiFiClient client;
  HTTPClient http;
  
  String url = "http://" + String(serverHost) + ":" + String(httpPort) + "/api/iot/bin-status";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  DynamicJsonDocument doc(200);
  doc["binId"] = binId;
  doc["location"] = location;
  doc["fillLevel"] = fillLevel;
  doc["distance"] = distance;
  doc["status"] = status;
  doc["timestamp"] = getTimestamp();
  doc["rssi"] = WiFi.RSSI();
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode == 200) {
    Serial.println("✅ Status update sent via HTTP");
  } else if (httpCode > 0) {
    Serial.print("⚠️ HTTP Response: ");
    Serial.println(httpCode);
  } else {
    Serial.print("❌ HTTP Error: ");
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
}

void sendCriticalAlert(float fillLevel) {
  // Try Socket.io first for real-time critical alert
  if (socketConnected) {
    DynamicJsonDocument doc(300);
    JsonArray array = doc.to<JsonArray>();
    
    array.add("iot-alert");
    
    JsonObject alertData = array.createNestedObject();
    alertData["type"] = "dustbin-full";
    alertData["binId"] = binId;
    alertData["location"] = location;
    alertData["fillLevel"] = fillLevel;
    alertData["message"] = "Dustbin is " + String(fillLevel, 1) + "% full! Immediate cleaning required.";
    alertData["priority"] = "high";
    alertData["timestamp"] = getTimestamp();
    alertData["rssi"] = WiFi.RSSI();
    
    String output;
    serializeJson(doc, output);
    
    socketIO.sendEVENT(output);
    Serial.println("🚨 Critical alert sent via Socket.io");
  }
  
  // Always send HTTP backup for critical alerts
  Serial.println("📡 Sending critical alert via HTTP backup...");
  float currentDistance = getFilteredDistance();
  if (currentDistance != -1) {
    sendHTTPStatus(fillLevel, currentDistance, "critical");
  }
}

// Enhanced sensor functions with better error handling
float getFilteredDistance() {
  float readings[7];
  int validReadings = 0;
  
  Serial.println("📏 Taking distance measurements...");
  
  for (int i = 0; i < 7; i++) {
    float distance = getSingleDistance();
    if (distance > 1 && distance < (binHeight + 50)) {
      readings[validReadings] = distance;
      validReadings++;
      Serial.print("  ✅ Reading ");
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(distance);
      Serial.println(" cm");
    } else {
      Serial.print("  ❌ Reading ");
      Serial.print(i + 1);
      Serial.println(": INVALID");
    }
    delay(100);
  }
  
  if (validReadings == 0) {
    Serial.println("❌ All distance readings invalid!");
    return -1;
  }
  
  Serial.print("✅ Valid readings: ");
  Serial.println(validReadings);
  
  // Sort and return median
  for (int i = 0; i < validReadings - 1; i++) {
    for (int j = i + 1; j < validReadings; j++) {
      if (readings[i] > readings[j]) {
        float temp = readings[i];
        readings[i] = readings[j];
        readings[j] = temp;
      }
    }
  }
  
  float median = readings[validReadings / 2];
  Serial.print("📊 Median distance: ");
  Serial.print(median);
  Serial.println(" cm");
  
  return median;
}

float getSingleDistance() {
  // Ensure clean trigger pulse
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  // Read echo with timeout
  long duration = pulseIn(echoPin, HIGH, 50000); // 50ms timeout
  
  if (duration <= 0) {
    return -1;
  }
  
  float distance = duration * 0.034 / 2;
  
  // Validate distance range
  if (distance < 1 || distance > 400) {
    return -1;
  }
  
  return distance;
}

float calculateFillLevel(float distance) {
  // Calculate actual filled height
  float actualDistance = distance - emptyDistance;
  float filledHeight = binHeight - actualDistance;
  
  // Calculate percentage
  float fillLevel = (filledHeight / binHeight) * 100;
  
  // Ensure values are within bounds
  if (fillLevel < 0) fillLevel = 0;
  if (fillLevel > 100) fillLevel = 100;
  
  return fillLevel;
}

void debugSensor() {
  Serial.println("\n🔧 Sensor Diagnostics:");
  Serial.println("1. Checking power (3.3V to VCC)");
  Serial.println("2. Checking ground (GND to GND)");
  Serial.println("3. Checking TRIG pin (D1/GPIO5)");
  Serial.println("4. Checking ECHO pin (D2/GPIO4)");
  
  // Test sensor multiple times
  for (int i = 0; i < 5; i++) {
    float testDistance = getSingleDistance();
    if (testDistance != -1) {
      Serial.print("   ✅ Test ");
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(testDistance);
      Serial.println(" cm");
    } else {
      Serial.print("   ❌ Test ");
      Serial.print(i + 1);
      Serial.println(": FAILED");
    }
    delay(500);
  }
}

void blinkLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  unsigned long currentMillis = millis();
  unsigned long blinkInterval = socketConnected ? 2000 : 500; // Slow blink when connected, fast when not
  
  if (currentMillis - lastBlink >= blinkInterval) {
    lastBlink = currentMillis;
    ledState = !ledState;
    digitalWrite(LED_BUILTIN, ledState ? LOW : HIGH);
  }
}

void resetSystem() {
  Serial.println("🔄 Performing system reset...");
  ESP.restart();
}

String getTimestamp() {
  unsigned long seconds = millis() / 1000;
  unsigned long minutes = seconds / 60;
  unsigned long hours = minutes / 60;
  
  char timestamp[20];
  snprintf(timestamp, sizeof(timestamp), "%02lu:%02lu:%02lu", 
           hours % 24, minutes % 60, seconds % 60);
  return String(timestamp);
}