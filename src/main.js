import './style.css'
import './script'
import './api/qwen'

document.querySelector('#app').innerHTML = `
<div class="app-wrapper">
      <!-- 导航栏 -->
      <div class="navbar">
        <div class="nav-left">
          <a href="index.html" class="nav-tab active">智能讲解</a>
          <a href="3D.html" class="nav-tab">非遗展陈</a>
        </div>

        <div class="nav-right">
          <div class="voice-indicator">
            <div class="voice-wave">
              <span></span><span></span><span></span><span></span>
            </div>
            <span style="color:#fbbf24;">AI 在线</span>
          </div>
        </div>
      </div>

      <!-- 主内容：左(数字人) 右(对话历史+快捷功能) -->
      <div class="main-dashboard">
        <div class="left-stage">
          <div class="character-section">
            <div class="character-3d">
              <canvas id="live2d" style="width: 45vw;"></canvas>
            </div>

            <div class="emotion-switch">
              <button class="emotion-btn active" onclick="setEmotion('happy')">
                😊 <span>开心</span>
              </button>
              <button class="emotion-btn" onclick="setEmotion('peace')">
                😌 <span>平静</span>
              </button>
              <button class="emotion-btn" onclick="setEmotion('thoughtful')">
                🤔 <span>思考</span>
              </button>
              <button class="emotion-btn" onclick="setEmotion('surprised')">
                😲 <span>惊讶</span>
              </button>
              <button class="emotion-btn" onclick="setEmotion('gentle')">
                🥰 <span>温柔</span>
              </button>
            </div>
          </div>
        </div>

        <div class="right-panel">
          <div class="function-bar">
            <div class="function-group">
              <div class="func-item"><i>🔊</i> 语音设置</div>
            </div>
            <div class="history-badge">📚 今日对话 12</div>
          </div>

          <div class="chat-history" id="chatHistory">
            <div class="message ai">
              👋 你好呀！我是你的数字人伙伴，今天想聊什么？
            </div>
            <div class="message user">
              你今天看起来心情不错？
            </div>
            <div class="message ai">
              当然啦～ 看到你就很开心！ 😊 有什么需要帮忙的吗？
            </div>
            <div class="message user">
              能介绍一下你的情绪切换功能吗？
            </div>
            <div class="message ai">
              你可以点击左侧的 emoji 按钮，我的表情和语音会根据情绪变化哦！现在试试看～
            </div>
          </div>

          <div class="input-area">
            <input type="text" placeholder="输入你想问的问题..." id="textInput">
            <button id="sendBtn">➤</button>
            <button id="voiceChatBtn" class="voice-chat-btn">🎤</button>
          </div>

          <div class="suggest-tags">
            <span class="tag" onclick="quickQuestion('什么是非物质文化遗产？')">什么是非物质文化遗产？</span>
            <span span class="tag" onclick="quickQuestion('请介绍一下兔儿爷的文化背景')">请介绍一下兔儿爷的文化背景</span>
            <span class="tag" onclick="quickQuestion('非遗文化为什么需要传承？')">非遗文化为什么需要传承？</span>
            <span class="tag" onclick="quickQuestion('还有哪些有代表性的中国非遗项目？')">还有哪些有代表性的中国非遗项目？</span>
          </div>
        </div>
      </div>
    </div>

    <div id="voiceModeUI" class="voice-mode-ui">
      <div class="voice-control-panel">
        <div class="voice-status" id="voiceStatus">
          点击麦克风开始语音聊天
        </div>

        <button class="voice-btn start" id="startVoice">🎙</button>
        <button class="voice-btn stop" id="stopVoice">■</button>
        <button class="voice-back-btn" id="backTextChat">⌨ 返回文本聊天</button>
      </div>
    </div>
`

setupCounter(document.querySelector('#counter'))
