import React, { useState, useRef, useEffect } from "react";
import {
  Layout,
  Input,
  Button,
  List,
  Avatar,
  Card,
  Spin,
  message,
  Tag,
  Tooltip,
} from "antd";
import {
  SendOutlined,
  UserOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  SmileOutlined,
  HeartFilled,
  CommentOutlined,
  InboxOutlined,
  AudioOutlined, // <--- Icon Micro
  StopOutlined, // <--- Icon Dừng
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";

const { Header, Content, Footer } = Layout;
const { TextArea } = Input;

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const GroqChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "Bạn là một trợ lý ảo thông thái, lịch sự và sử dụng tiếng Việt tự nhiên, giàu cảm xúc. Hãy trả lời ngắn gọn, đi vào trọng tâm.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedModel, setUsedModel] = useState<string>("Ready");

  // --- STATE CHO GHI ÂM ---
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null); // Lưu instance của SpeechRecognition

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isListening]); // Scroll khi tin nhắn mới hoặc đang ghi âm

  // --- HÀM XỬ LÝ GHI ÂM (SPEECH TO TEXT) ---
  const toggleListening = () => {
    if (isListening) {
      // Nếu đang nghe thì dừng lại
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // Kiểm tra trình duyệt có hỗ trợ không
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      message.error("Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN"; // Cấu hình tiếng Việt
    recognition.continuous = false; // Tự động dừng khi ngắt câu
    recognition.interimResults = true; // Hiển thị kết quả tạm thời (real-time)

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join("");

      // Cập nhật vào ô input ngay lập tức
      setInputValue(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Lỗi ghi âm:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        message.error("Vui lòng cấp quyền Micro để sử dụng.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };
  // ------------------------------------------

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // Tắt mic nếu đang bật khi gửi
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const newUserMsg: Message = { role: "user", content: inputValue };
    const newHistory = [...messages, newUserMsg];

    setMessages(newHistory);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
      setUsedModel(data.usedModel);
    } catch (error) {
      console.error(error);
      message.error("Kết nối không ổn định, vui lòng thử lại.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "🍃 **Xin lỗi bạn!** Đường truyền đang gặp chút trục trặc. Bạn vui lòng gửi lại tin nhắn nhé.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="chatbot-container">
      {/* HEADER */}
      <Header className="chatbot-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              background: "rgba(58, 125, 68, 0.1)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3A7D44",
            }}
          >
            <GlobalOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <div className="header-title">Trợ Lý Ảo</div>
          </div>
        </div>

        <Tooltip title={`Mô hình đang dùng: ${usedModel}`}>
          <Tag
            style={{
              borderRadius: 20,
              padding: "4px 12px",
              border: "1px solid #C5E1A5",
              background: "#F1F8E9",
              color: "#33691E",
              fontFamily: "Be Vietnam Pro",
              fontWeight: 500,
            }}
          >
            {usedModel === "Ready" ? "Sẵn sàng" : `⚡ ${usedModel}`}
          </Tag>
        </Tooltip>
      </Header>

      {/* CONTENT */}
      <Content className="chatbot-content">
        {messages.length === 1 && (
          <div style={{ textAlign: "center", marginTop: "15vh", opacity: 0.8 }}>
            <div
              style={{
                background: "#E8F5E9",
                width: 80,
                height: 80,
                borderRadius: "50%",
                margin: "0 auto 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CommentOutlined style={{ fontSize: 36, color: "#3A7D44" }} />
            </div>
            <h2
              style={{
                fontFamily: "Be Vietnam Pro",
                fontWeight: 600,
                color: "#2C362B",
                marginBottom: 10,
              }}
            >
              Xin chào, bạn cần hỗ trợ gì không?
            </h2>
            <p
              style={{
                color: "#748B75",
                fontSize: 15,
                maxWidth: 400,
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Hãy hỏi tôi về văn hóa, viết lách, công nghệ hoặc bất cứ điều gì
              bạn đang thắc mắc.
            </p>
          </div>
        )}

        <List
          locale={{
            emptyText: (
              <div style={{ padding: "20px 0", color: "#A3B1A5" }}>
                <InboxOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <div style={{ fontFamily: "Be Vietnam Pro", fontSize: 14 }}>
                  Chưa có gì
                </div>
              </div>
            ),
          }}
          itemLayout="horizontal"
          dataSource={messages.filter((m) => m.role !== "system")}
          split={false}
          renderItem={(item) => (
            <div
              className={`message-row ${item.role === "user" ? "user" : "ai"}`}
            >
              {item.role === "assistant" && (
                <Avatar
                  style={{
                    marginRight: 12,
                    backgroundColor: "#E8F5E9",
                    color: "#3A7D44",
                    border: "1px solid #C8E6C9",
                  }}
                  size={42}
                  icon={<SmileOutlined />}
                />
              )}

              <Card className="message-card">
                <div className="markdown-body">
                  {item.role === "assistant" ? (
                    <ReactMarkdown>{item.content}</ReactMarkdown>
                  ) : (
                    <span>{item.content}</span>
                  )}
                </div>
              </Card>

              {item.role === "user" && (
                <Avatar
                  icon={<UserOutlined />}
                  style={{
                    marginLeft: 12,
                    backgroundColor: "#3A7D44",
                    color: "#fff",
                  }}
                  size={42}
                />
              )}
            </div>
          )}
        />

        {/* Hiển thị trạng thái đang nghe */}
        {isListening && (
          <div
            style={{
              textAlign: "center",
              marginBottom: 10,
              color: "#D4380D",
              animation: "fadeIn 0.3s",
            }}
          >
            <span className="pulsing-mic">●</span> Đang lắng nghe giọng nói của
            bạn...
          </div>
        )}

        {loading && (
          <div
            style={{
              marginLeft: 60,
              marginBottom: 20,
              color: "#748B75",
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            <Spin
              indicator={
                <HeartFilled
                  style={{ fontSize: 14, color: "#D4A017", marginRight: 8 }}
                  spin
                />
              }
            />
            Đang suy nghĩ...
          </div>
        )}
        <div ref={bottomRef} />
      </Content>

      {/* FOOTER INPUT */}
      <Footer className="chatbot-footer">
        <div className="input-container">
          {/* NÚT MICRO MỚI */}
          <Button
            type="text"
            shape="circle"
            onClick={toggleListening}
            style={{
              color: isListening ? "#FF4D4F" : "#3A7D44",
              background: isListening ? "#FFF1F0" : "transparent",
              border: isListening ? "1px solid #FF4D4F" : "none",
              marginRight: 4,
            }}
            icon={
              isListening ? (
                <StopOutlined />
              ) : (
                <AudioOutlined style={{ fontSize: 18 }} />
              )
            }
          />

          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isListening ? "Đang ghi âm..." : "Nhập tin nhắn..."}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="custom-textarea"
            disabled={loading}
          />
          <Button
            type="primary"
            onClick={handleSend}
            loading={loading}
            className="send-btn"
            icon={
              <SendOutlined
                style={{
                  fontSize: 20,
                  marginLeft: loading ? 0 : 3,
                  color: "#fff",
                }}
              />
            }
          />
        </div>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <span style={{ fontSize: 12, color: "#A3B1A5" }}>
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            AI có thể mắc lỗi, hãy kiểm chứng thông tin quan trọng.
          </span>
        </div>
      </Footer>
    </Layout>
  );
};

export default GroqChatbot;
