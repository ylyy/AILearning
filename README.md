# AILearning
Welcome to the AILearning wiki!

大家好我是一个科幻爱好者，致力于用ai改善生活。目前在职，业余学习ai大模型应用，创建该分享交流仓库是基于书生大模型实战营。 学习链接在这GitHub 仓库（https://github.com/InternLM/Tutorial）。报名参加第三期实战营项目评选将解锁 30% A100 和 168 团队算力点资源，报名链接：https://aicarrier.feishu.cn/wiki/DjY6whCO0inTu2kQN9Cchxgynme

完成了一些实战作业可以看我的知乎专栏书生大模型实战营（暑假场） 入门岛第1关 - 杨柳依依的文章 - 知乎 https://zhuanlan.zhihu.com/p/713821527

期待和你一起进步
#include <M5Atom.h>

#include "AudioFileSourceICYStream.h"
#include "AudioFileSourceBuffer.h"
#include "AudioGeneratorMP3.h"
#include "AudioOutputI2S.h"

const char *SSID = "IQOO";
const char *PASSWORD = "88888888";

const char *URL="http://music.163.com/song/media/outer/url?id=2616461226.mp3";

AudioGeneratorMP3 *mp3;
AudioFileSourceICYStream *file;
AudioFileSourceBuffer *buff;
AudioOutputI2S *out;

// Called when a metadata event occurs (i.e. an ID3 tag, an ICY block, etc.
void MDCallback(void *cbData, const char *type, bool isUnicode, const char *string)
{
  const char *ptr = reinterpret_cast<const char *>(cbData);
  (void) isUnicode; // Punt this ball for now
  // Note that the type and string may be in PROGMEM, so copy them to RAM for printf
  char s1[32], s2[64];
  strncpy_P(s1, type, sizeof(s1));
  s1[sizeof(s1)-1]=0;
  strncpy_P(s2, string, sizeof(s2));
  s2[sizeof(s2)-1]=0;
  Serial.printf("METADATA(%s) '%s' = '%s'\n", ptr, s1, s2);
  Serial.flush();
}

// Called when there's a warning or error (like a buffer underflow or decode hiccup)
void StatusCallback(void *cbData, int code, const char *string)
{
  const char *ptr = reinterpret_cast<const char *>(cbData);
  // Note that the string may be in PROGMEM, so copy it to RAM for printf
  char s1[64];
  strncpy_P(s1, string, sizeof(s1));
  s1[sizeof(s1)-1]=0;
  Serial.printf("STATUS(%s) '%d' = '%s'\n", ptr, code, s1);
  Serial.flush();
}


void setup()
{
  M5.begin(true, false, true);
  Serial.begin(115200);
  delay(1000);
  Serial.println("Connecting to WiFi");
  WiFi.disconnect();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  
  WiFi.begin(SSID, PASSWORD);

  M5.dis.drawpix(0, 0xf00000);
  M5.update();
  while (WiFi.status() != WL_CONNECTED) {
    Serial.println("...Connecting to WiFi");
    delay(1000);   
  }
  Serial.println("Connected");

  audioLogger = &Serial;
  file = new AudioFileSourceICYStream(URL);
  file->RegisterMetadataCB(MDCallback, (void*)"ICY");
  buff = new AudioFileSourceBuffer(file, 10240);
  buff->RegisterStatusCB(StatusCallback, (void*)"buffer");
  out = new AudioOutputI2S();
  mp3 = new AudioGeneratorMP3();
  mp3->RegisterStatusCB(StatusCallback, (void*)"mp3");
  mp3->begin(buff, out);
}


void loop()
{
  static int lastms = 0;
  
  if (mp3->isRunning()) {
    M5.dis.drawpix(0, 0x00ffff);
    if (millis()-lastms > 1000) {
      lastms = millis();
      Serial.printf("Running for %d ms...\n", lastms);
      Serial.flush();
     }
    if (!mp3->loop()) mp3->stop();
  } else {
    M5.dis.drawpix(0, 0xffffff);
    Serial.printf("MP3 done\n");
    delay(1000);
  }
  M5.update();
}
