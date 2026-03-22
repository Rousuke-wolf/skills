import { chatWithAI } from "./api/qwen";
let chatHistoryData = [];

function handleModelDisplay(index) {
    console.log("👉 展示模型 index =", index);

    // 👉 你可以在这里做任何事情

    // 示例1：跳转页面
    // window.location.href = "3D.html?model=" + index;

    // 示例2：调用3D展示函数
    if (window.showModel) {
        window.showModel(index);
    }

    // 示例3：提示
    alert("正在展示非遗模型，编号：" + index);
}

function showModelError(message) {
    console.error("模型错误:", message);

    const canvas = document.getElementById("live2d");
    if (!canvas || !canvas.parentElement) return;

    const container = canvas.parentElement;

    const oldError = container.querySelector(".live2d-error-message");
    if (oldError) oldError.remove();

    const errorMsg = document.createElement("div");
    errorMsg.className = "live2d-error-message";
    errorMsg.style.cssText = `
        color: #fbbf24;
        text-align: center;
        padding: 20px;
        background: rgba(0,0,0,0.8);
        border-radius: 10px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        z-index: 100;
        border: 1px solid #fbbf24;
        line-height: 1.6;
    `;
    errorMsg.innerHTML = `<div style="font-size:18px;">❌ ${message}</div>`;
    container.appendChild(errorMsg);
}

function setEmotion(emotion) {
    const btns = document.querySelectorAll(".emotion-btn");
    btns.forEach(btn => btn.classList.remove("active"));

    btns.forEach(btn => {
        const text = btn.innerText;
        if (
            (emotion === "happy" && text.includes("开心")) ||
            (emotion === "peace" && text.includes("平静")) ||
            (emotion === "thoughtful" && text.includes("思考")) ||
            (emotion === "surprised" && text.includes("惊讶")) ||
            (emotion === "gentle" && text.includes("温柔"))
        ) {
            btn.classList.add("active");
        }
    });

    if (window.live2dModel) {
        try {
            switch (emotion) {
                case "happy":
                    window.live2dModel.expression("exp_01");
                    break;
                case "peace":
                    window.live2dModel.expression("exp_02");
                    break;
                case "thoughtful":
                    window.live2dModel.expression("exp_03");
                    break;
                case "surprised":
                    window.live2dModel.expression("exp_04");
                    break;
                case "gentle":
                    window.live2dModel.expression("exp_05");
                    break;
            }
        } catch (e) {
            console.warn("表情切换失败，可能当前模型不支持该调用方式:", e);
        }
    }
}

function quickQuestion(question) {
    const history = document.getElementById("chatHistory");
    if (!history) return;

    const userMsg = document.createElement("div");
    userMsg.className = "message user";
    userMsg.textContent = question;
    history.appendChild(userMsg);

    (async () => {
        const res = await chatWithAI(chatHistoryData, question);

        // ✅ 记录上下文
        chatHistoryData.push({ role: "user", content: question });
        chatHistoryData.push({ role: "assistant", content: res.message });

        appendAI(res.message);

        // ✅ 触发模型（核心！！）
        if (res.isShowModel) {
            handleModelDisplay(res.modelIndex);
        }
    })();

    history.scrollTop = history.scrollHeight;
}

// 语音功能
let recognition;
let recognizing = false;

function appendUser(text) {
    const chatHistory = document.getElementById("chatHistory");
    if (!chatHistory) return;

    const div = document.createElement("div");
    div.className = "message user";
    div.innerText = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendAI(text) {
    const chatHistory = document.getElementById("chatHistory");
    if (!chatHistory) return;

    const div = document.createElement("div");
    div.className = "message ai";
    div.innerText = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    speak(text);
}

function initRecognition(voiceStatus) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        voiceStatus.innerText = "当前浏览器不支持语音识别";
        return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = "zh-CN";
    rec.continuous = false; // 单次识别
    rec.interimResults = false; // 只要最终结果

    // ✅ 开始识别
    rec.onstart = () => {
        recognizing = true;
        voiceStatus.innerText = "正在听...";
    };

    // ✅ 识别结果
    rec.onresult = async (e) => {
        const text = e.results[0][0].transcript;

        appendUser(text);

        try {
            const res = await chatWithAI(chatHistoryData, text);

            chatHistoryData.push({ role: "user", content: text });
            chatHistoryData.push({ role: "assistant", content: res.message });
            console.log(res)

            appendAI(res.message);

            if (res.isShowModel) {
                handleModelDisplay(res.modelIndex);
            }

        } catch (err) {
            console.error("AI调用失败:", err);
            appendAI("刚刚有点问题，我们再试一次吧～");
        }
    };

    // ✅ 结束
    rec.onend = () => {
        recognizing = false;
        voiceStatus.innerText = "语音结束";
    };

    // ✅ 错误
    rec.onerror = (e) => {
        recognizing = false;
        voiceStatus.innerText = "语音识别出错";
        console.error("语音识别错误:", e);
    };

    return rec;
}

function stopRecognition() {
    if (recognition && recognizing) {
        recognition.stop();
    }
}

function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "zh-CN";
    window.speechSynthesis.speak(speech);
}

// Live2D 初始化
async function initLive2D() {
    try {
        if (typeof PIXI === "undefined") {
            showModelError("PIXI 库加载失败");
            return;
        }

        if (typeof Live2DCubismCore === "undefined") {
            showModelError("Cubism Core 未加载");
            return;
        }

        if (!PIXI.live2d || !PIXI.live2d.Live2DModel) {
            showModelError("Cubism4 插件未正确加载");
            return;
        }

        const canvas = document.getElementById("live2d");
        const container = document.querySelector(".character-3d");

        if (!canvas || !container) {
            showModelError("找不到 Live2D 显示区域");
            return;
        }

        const app = new PIXI.Application({
            view: canvas,
            resizeTo: container,
            transparent: true,
            autoStart: true
        });

        const model = await PIXI.live2d.Live2DModel.from("..\\public\\model\\hiyori\\hiyori.model3.json");

        window.live2dApp = app;
        window.live2dModel = model;

        app.stage.addChild(model);

        if (model.anchor) {
            model.anchor.set(0.5, 1);
        }

        /* 全身显示参数 */
        model.x = app.renderer.width / 2;
        model.y = app.renderer.height * 1.02;
        model.scale.set(0.15);

        model.interactive = true;

        model.on("pointerdown", () => {
            try {
                model.motion("TapBody");
            } catch (e) {
                console.warn("点击动作触发失败:", e);
            }
        });

        window.addEventListener("resize", () => {
            if (!window.live2dModel || !window.live2dApp) return;

            window.live2dModel.x = window.live2dApp.renderer.width / 2;
            window.live2dModel.y = window.live2dApp.renderer.height * 1.02;
            window.live2dModel.scale.set(0.11);
        });

        try {
            model.expression("exp_01");
        } catch (e) {
            console.warn("初始表情加载失败:", e);
        }

        console.log("Live2D 模型加载成功");
    } catch (error) {
        console.error("Live2D 初始化失败:", error);
        showModelError("模型加载失败，请检查控制台报错");
    }
}
document.addEventListener("DOMContentLoaded", function () {
    const voiceBtn = document.getElementById("voiceChatBtn");
    const appWrapper = document.querySelector(".app-wrapper");
    const voiceUI = document.getElementById("voiceModeUI");
    const startBtn = document.getElementById("startVoice");
    const stopBtn = document.getElementById("stopVoice");
    const backBtn = document.getElementById("backTextChat");
    const voiceStatus = document.getElementById("voiceStatus");
    const playIntroBtn = document.getElementById("playIntroBtn");
    const audioStatus = document.getElementById("audioStatus");
    const modelIntroText = document.getElementById("modelIntroText");
    const sendBtn = document.getElementById("sendBtn");
    const input = document.getElementById("textInput");

    if (sendBtn && input) {
        sendBtn.onclick = async () => {
            const text = input.value.trim();
            if (!text) return;

            appendUser(text);
            input.value = "";

            const res = await chatWithAI(chatHistoryData, text);

            // ✅ 存上下文
            chatHistoryData.push({ role: "user", content: text });
            chatHistoryData.push({ role: "assistant", content: res.message });

            appendAI(res.message);

            // ✅ 触发模型
            if (res.isShowModel) {
                handleModelDisplay(res.modelIndex);
            }
        };
    }

    if (voiceBtn && appWrapper && voiceUI && voiceStatus) {
        voiceBtn.onclick = () => {
            appWrapper.classList.add("voice-mode");
            voiceUI.style.display = "flex";
            voiceStatus.innerText = "点击麦克风开始语音聊天";
        };
    }

    if (backBtn && appWrapper && voiceUI) {
        backBtn.onclick = () => {
            appWrapper.classList.remove("voice-mode");
            voiceUI.style.display = "none";
            stopRecognition();
        };
    }

    if (startBtn && voiceStatus) {
        startBtn.onclick = () => {
            if (!recognition) {
                recognition = initRecognition(voiceStatus);
            }
            if (recognition) {
                recognition.start();
            }
        };
    }

    if (stopBtn) {
        stopBtn.onclick = () => {
            stopRecognition();
        };
    }
    let introSpeaking = false;
    let introSpeech = null;

    if (playIntroBtn && audioStatus && modelIntroText) {
        playIntroBtn.onclick = () => {
            if (introSpeaking) {
                window.speechSynthesis.cancel();
                introSpeaking = false;
                playIntroBtn.classList.remove("playing");
                playIntroBtn.innerHTML = "🎤";
                audioStatus.innerText = "";
                return;
            }

            const text = modelIntroText.innerText.trim();
            if (!text) {
                audioStatus.innerText = "";
                return;
            }

            window.speechSynthesis.cancel();

            introSpeech = new SpeechSynthesisUtterance(text);
            introSpeech.lang = "zh-CN";
            introSpeech.rate = 1;
            introSpeech.pitch = 1;
            introSpeech.volume = 1;

            introSpeech.onstart = () => {
                introSpeaking = true;
                playIntroBtn.classList.add("playing");
                playIntroBtn.innerHTML = "■";
                audioStatus.innerText = "正在播放讲解，点击按钮可停止";
            };

            introSpeech.onend = () => {
                introSpeaking = false;
                playIntroBtn.classList.remove("playing");
                playIntroBtn.innerHTML = "🎤";
                audioStatus.innerText = "";
            };

            introSpeech.onerror = () => {
                introSpeaking = false;
                playIntroBtn.classList.remove("playing");
                playIntroBtn.innerHTML = "🎤";
                audioStatus.innerText = "";
            };

            window.speechSynthesis.speak(introSpeech);
        };
    }
    setEmotion("happy");
    initLive2D();
    console.log("页面初始化完成");
});

