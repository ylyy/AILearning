# AILearning
Welcome to the AILearning wiki!

大家好我是一个科幻爱好者，致力于用ai改善生活。目前在职，业余学习ai大模型应用，创建该分享交流仓库是基于书生大模型实战营。 学习链接在这GitHub 仓库（https://github.com/InternLM/Tutorial）。报名参加第三期实战营项目评选将解锁 30% A100 和 168 团队算力点资源，报名链接：https://aicarrier.feishu.cn/wiki/DjY6whCO0inTu2kQN9Cchxgynme

完成了一些实战作业可以看我的知乎专栏书生大模型实战营（暑假场） 入门岛第1关 - 杨柳依依的文章 - 知乎 https://zhuanlan.zhihu.com/p/713821527

期待和你一起进步
#include <M5Atom.h>
#include <Arduino.h>
#include "base64.h"
#include "WiFi.h"
#include <WiFiClientSecure.h>
#include "HTTPClient.h"
#include "Audio1.h"
#include "Audio2.h"
#include <ArduinoJson.h>
#include <ArduinoWebsockets.h>
#include <driver/i2s.h>

using namespace websockets;
#define key 0
#define ADC 32
#define led3 2
#define led2 18
#define led1 19
const char *wifiData[][2] = {
    {"IQOO", "88888888"}, // 替换为自己常用的wifi名和密码
    // {"222", "12345678"},
    // 继续添加需要的 Wi-Fi 名称和密码
};

String APPID = "72e78f96"; 
String APIKey = "7d40a5a094a70adb709169ed3be2aac1";
String APISecret = "Zjc3ZGM2YjY4M2ExNTJlM2JmNWI2NjJl";

bool ledstatus = true;
bool startPlay = false;
bool lastsetence = false;
bool isReady = false;
unsigned long urlTime = 0;
unsigned long pushTime = 0;
int mainStatus = 0;
int receiveFrame = 0;
int noise = 50;
int isplaying = 0;
HTTPClient https;

hw_timer_t *timer = NULL;

uint8_t adc_start_flag = 0;
uint8_t adc_complete_flag = 0;

// Audio1 audio1;
// Audio2 audio2(false, 3, I2S_NUM_1);

uint8_t microphonedata0[1024 * 80];
size_t byte_read = 0;
int16_t *buffptr;
uint32_t data_offset = 0;
#define DATA_SIZE 1024

String SpakeStr;
bool Spakeflag = false;

#define I2S_DOUT 22 // DIN
#define I2S_BCLK 19 // BCLK
#define I2S_LRC 33  // LRC

void gain_token(void);
float calculateRMS(uint8_t *buffer, int bufferSize);
void ConnServer1();

DynamicJsonDocument doc(2000);
JsonArray text = doc.to<JsonArray>();

String url = "";
String url1 = "";
String Date = "";

String askquestion = "";
String Answer = "";

const char *appId1 = "72e78f96"; 
const char *domain1 = "generalv3";
const char *websockets_server = "ws://spark-api.xf-yun.com/v3.1/chat";
const char *websockets_server1 = "ws://192.168.194.174:8765";
using namespace websockets;

#define SPEAK_I2S_NUMBER I2S_NUM_0
#define MODE_MIC 0
#define MODE_SPK 1
#define CONFIG_I2S_BCK_PIN     19
#define CONFIG_I2S_LRCK_PIN    33
#define CONFIG_I2S_DATA_PIN    22
#define CONFIG_I2S_DATA_IN_PIN 23

bool InitI2SSpeakOrMic(int mode) {
    esp_err_t err = ESP_OK;

    i2s_driver_uninstall(SPEAK_I2S_NUMBER);
    i2s_config_t i2s_config = {
        .mode        = (i2s_mode_t)(I2S_MODE_MASTER),
        .sample_rate = 16000,
        .bits_per_sample =
            I2S_BITS_PER_SAMPLE_16BIT,  // is fixed at 12bit, stereo, MSB
        .channel_format = I2S_CHANNEL_FMT_ALL_RIGHT,
#if ESP_IDF_VERSION > ESP_IDF_VERSION_VAL(4, 1, 0)
        .communication_format =
            I2S_COMM_FORMAT_STAND_I2S,  // Set the format of the communication.
#else                                   // 设置通讯格式
        .communication_format = I2S_COMM_FORMAT_I2S,
#endif
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count    = 6,
        .dma_buf_len      = 60,
    };
    if (mode == MODE_MIC) {
        i2s_config.mode =
            (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_PDM);
    } else {
        i2s_config.mode     = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX);
        i2s_config.use_apll = false;
        i2s_config.tx_desc_auto_clear = true;
    }

    Serial.println("Init i2s_driver_install");

    err += i2s_driver_install(SPEAK_I2S_NUMBER, &i2s_config, 0, NULL);
    i2s_pin_config_t tx_pin_config;

#if (ESP_IDF_VERSION > ESP_IDF_VERSION_VAL(4, 3, 0))
    tx_pin_config.mck_io_num = I2S_PIN_NO_CHANGE;
#endif
    tx_pin_config.bck_io_num   = CONFIG_I2S_BCK_PIN;
    tx_pin_config.ws_io_num    = CONFIG_I2S_LRCK_PIN;
    tx_pin_config.data_out_num = CONFIG_I2S_DATA_PIN;
    tx_pin_config.data_in_num  = CONFIG_I2S_DATA_IN_PIN;

    Serial.println("Init i2s_set_pin");
    err += i2s_set_pin(SPEAK_I2S_NUMBER, &tx_pin_config);
    Serial.println("Init i2s_set_clk");
    err += i2s_set_clk(SPEAK_I2S_NUMBER, 16000, I2S_BITS_PER_SAMPLE_16BIT,
                       I2S_CHANNEL_MONO);

    return true;
}


WebsocketsClient webSocketClient;
WebsocketsClient webSocketClient1;

int loopcount = 0;
void onMessageCallback(WebsocketsMessage message)
{
    StaticJsonDocument<1024> jsonDocument;
    DeserializationError error = deserializeJson(jsonDocument, message.data());

    if (!error)
    {
        int code = jsonDocument["header"]["code"];
        if (code != 0)
        {
            Serial.print("sth is wrong: ");
            Serial.println(code);
            Serial.println(message.data());
            webSocketClient.close();
        }
        else
        {
            receiveFrame++;
            Serial.print("receiveFrame:");
            Serial.println(receiveFrame);
            Serial.println(message.data());
            //{"code": 0, "data": {"status": 2, "result": "http://localhost:8000//Users/test/Downloads/esp32-chattoys-server/media/4399404064-out.wav"}}
            String result = jsonDocument["data"]["result"];
            if (result.length() > 0 && (isplaying == 0))
            {
                //"result": "http://localhost:8000//Users/test/Downloads/esp32-chattoys-server/media/4399404064-out.wav"
                //result转换为仅获取最后一个/后的字符串
                InitI2SSpeakOrMic(MODE_SPK);

                String audioStreamURL = "http://192.168.194.174:8000/" + result.substring(result.lastIndexOf("/") + 1);
                Serial.println(audioStreamURL);
                // audio2.connecttohost(audioStreamURL.c_str());
                startPlay = true;
            }
        }
    }
}

void onEventsCallback1(WebsocketsEvent event, String data)
{
    if (event == WebsocketsEvent::ConnectionOpened)
    {
        Serial.println("Send message to coze");
        digitalWrite(led2, HIGH);
        int silence = 0;
        int firstframe = 1;
        int j = 0;
        int voicebegin = 0;
        int voice = 0;
        DynamicJsonDocument doc(2500);
        while (1)
        {
            doc.clear();
            JsonObject data = doc.createNestedObject("data");
            i2s_read(SPEAK_I2S_NUMBER, (char *)(microphonedata0 + data_offset),
                     DATA_SIZE, &byte_read, (100 / portTICK_RATE_MS));
            data_offset += 1024;
            // for (int i = 0; i < audio1.i2sBufferSize / 8; ++i)
            // {
            //     audio1.wavData[0][2 * i] = audio1.i2sBuffer[8 * i + 2];
            //     audio1.wavData[0][2 * i + 1] = audio1.i2sBuffer[8 * i + 3];
            // }
            float rms = calculateRMS((uint8_t *)microphonedata0, DATA_SIZE);
            printf("%d %f\n", 0, rms);
            if (rms < noise)
            {
                if (voicebegin == 1)
                {
                    silence++;
                    // Serial.print("noise:");
                    // Serial.println(noise);
                }
            }
            else
            {
                voice++;
                if (voice >= 5)
                {
                    voicebegin = 1;
                }
                else
                {
                    voicebegin = 0;
                }
                silence = 0;
            }
            if (silence == 6)
            {
                data["status"] = 2;
                data["format"] = "audio/L16;rate=8000";
                data["audio"] = "";
                data["encoding"] = "raw";
                j++;
                //jsonString发送{'data': {'status': 2, 'format': 'audio/L16;rate=8000', 'audio': '', 'encoding': 'raw'}}
                String jsonString;
                serializeJson(doc, jsonString);
                Serial.println("send_2:");
                webSocketClient1.send(jsonString);
                Serial.println("send_2 end");
                Serial.println(jsonString);
                digitalWrite(led2, LOW);
                delay(40);
                break;
            }
            if (firstframe == 1)
            {
                data["status"] = 0;
                data["format"] = "audio/L16;rate=8000";
                data["audio"] = base64::encode((byte *)microphonedata0, DATA_SIZE);
                data["encoding"] = "raw";
                j++;

                JsonObject common = doc.createNestedObject("common");
                common["app_id"] = appId1;

                JsonObject business = doc.createNestedObject("business");
                business["domain"] = "iat";
                business["language"] = "zh_cn";
                business["accent"] = "mandarin";
                business["vinfo"] = 1;
                business["vad_eos"] = 1000;

                String jsonString;
                serializeJson(doc, jsonString);
                Serial.println("send_0:");
                Serial.println(jsonString);
                webSocketClient1.send(jsonString);
                Serial.println("send_0 end");
                firstframe = 0;
                delay(40);
            }
            else
            {
                data["status"] = 1;
                data["format"] = "audio/L16;rate=8000";
                data["audio"] = base64::encode((byte *)microphonedata0, DATA_SIZE);
                data["encoding"] = "raw";

                String jsonString;
                serializeJson(doc, jsonString);
                Serial.println("send_1:");
                Serial.println(jsonString);
                webSocketClient1.send(jsonString);
                Serial.println("send_1 end");
                delay(40);
            }
        }
    }
    else if (event == WebsocketsEvent::ConnectionClosed)
    {
        Serial.println("Connnection1 Closed");
    }
    else if (event == WebsocketsEvent::GotPing)
    {
        Serial.println("Got a Ping!");
    }
    else if (event == WebsocketsEvent::GotPong)
    {
        Serial.println("Got a Pong!");
    }
}
void ConnServer1()
{
    // Serial.println("url1:" + url1);
    webSocketClient1.onMessage(onMessageCallback);
    webSocketClient1.onEvent(onEventsCallback1);
    // Connect to WebSocket
    Serial.println("Begin connect to server1...... url1:" + url1);
    if (webSocketClient1.connect(url1.c_str()))
    {
        Serial.println("Connected to server1!");
    }
    else
    {
        Serial.println("Failed to connect to server1!");
    }
}

void wifiConnect(const char *wifiData[][2], int numNetworks)
{
    WiFi.disconnect(true);
    for (int i = 0; i < numNetworks; ++i)
    {
        const char *ssid = wifiData[i][0];
        const char *password = wifiData[i][1];

        Serial.print("Connecting to ");
        Serial.println(ssid);

        WiFi.begin(ssid, password);
        uint8_t count = 0;
        while (WiFi.status() != WL_CONNECTED)
        {
            digitalWrite(led1, ledstatus);
            ledstatus = !ledstatus;
            Serial.print(".");
            count++;
            if (count >= 30)
            {
                Serial.printf("\r\n-- wifi connect fail! --");
                break;
            }
            vTaskDelay(100);
        }

        if (WiFi.status() == WL_CONNECTED)
        {
            Serial.printf("\r\n-- wifi connect success! --\r\n");
            Serial.print("IP address: ");
            Serial.println(WiFi.localIP());
            Serial.println("Free Heap: " + String(ESP.getFreeHeap()));
            return; // 如果连接成功，退出函数
        }
    }
}


void setup()
{
    // String Date = "Fri, 22 Mar 2024 03:35:56 GMT";
    Serial.begin(115200);
    // pinMode(ADC,ANALOG);
    WiFi.mode(WIFI_AP_STA);   // Set the wifi mode to the mode compatible with
                              // the AP and Station, and start intelligent
                              // network configuration
    WiFi.beginSmartConfig();  // 设置wifi模式为AP 与 Station
    int numNetworks = sizeof(wifiData) / sizeof(wifiData[0]);
    while (WiFi.status() != WL_CONNECTED) {  // M5Core2 will connect automatically upon receipt of
                        // the configuration information, and return true if
                        // the connection is successful.
                        // 收到配网信息后M5Core2将自动连接，若连接成功将返回true
        delay(500);
    }
    // String Date = "Fri, 22 Mar 2024 03:35:56 GMT";
    url = "ws://192.168.194.174:8765";
    //url1 = getUrl("ws://192.168.194.174:8765", "192.168.194.174", "/wss", Date);
    url1 = "ws://192.168.194.174:8765";

    ///////////////////////////////////
}

void loop()
{

    //webSocketClient.poll();
    webSocketClient1.poll();
    // delay(10);

    // audio2.loop();

    if (isplaying == 1)
    {
        digitalWrite(led3, HIGH);
    }
    else
    {
        digitalWrite(led3, LOW);
        if ((urlTime + 240000 < millis()) && (isplaying == 0))
        {
            urlTime = millis();
            url = "ws://192.168.194.174:8765";
            url1 = "ws://192.168.194.174:8765";
        }
    }

    if (M5.Btn.isPressed())
    {
        isplaying = 0;
        startPlay = false;
        isReady = false;
        Answer = "";
        Serial.printf("Start recognition\r\n\r\n");

        adc_start_flag = 1;
        // Serial.println(esp_get_free_heap_size());
        data_offset = 0;
        Spakeflag   = false;
        InitI2SSpeakOrMic(MODE_MIC);
        
        askquestion = "";
        // audio2.connecttospeech(askquestion.c_str(), "zh");
        ConnServer1();

        // delay(6000);
        // audio1.Record();
        adc_complete_flag = 0;

        // Serial.println(text);
        // checkLen(text);
    }
}

float calculateRMS(uint8_t *buffer, int bufferSize)
{
    float sum = 0;
    int16_t sample;

    for (int i = 0; i < bufferSize; i += 2)
    {

        sample = (buffer[i + 1] << 8) | buffer[i];
        sum += sample * sample;
    }

    sum /= (bufferSize / 2);

    return sqrt(sum);
}
