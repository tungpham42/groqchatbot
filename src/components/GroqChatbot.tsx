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
  Popconfirm, // <--- Thêm Popconfirm để xác nhận xóa
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
  AudioOutlined,
  StopOutlined,
  DeleteOutlined, // <--- Thêm Icon thùng rác
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";

const { Header, Content, Footer } = Layout;
const { TextArea } = Input;

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const GroqChatbot: React.FC = () => {
  // System prompt mặc định
  const INITIAL_MESSAGE: Message = {
    role: "system",
    content:
      "Bạn là một trợ lý ảo thông thái, lịch sự và sử dụng tiếng Việt tự nhiên, giàu cảm xúc. Hãy trả lời ngắn gọn, đi vào trọng tâm.",
  };

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedModel, setUsedModel] = useState<string>("Ready");

  // --- STATE CHO GHI ÂM ---
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimer = useRef<any>(null);
  const SILENCE_TIMEOUT = 2000;

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isListening]);

  useEffect(() => {
    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, []);

  // --- HÀM XÓA CHAT ---
  const handleClearChat = () => {
    setMessages([INITIAL_MESSAGE]); // Reset về tin nhắn hệ thống ban đầu
    setUsedModel("Ready");
    message.success("Đã xóa lịch sử trò chuyện");
  };

  // --- HÀM GỬI TIN NHẮN ---
  const handleSend = async (manualText?: string) => {
    const contentToSend =
      typeof manualText === "string" ? manualText : inputValue;

    if (!contentToSend.trim()) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    }

    const newUserMsg: Message = { role: "user", content: contentToSend };
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

  // --- HÀM XỬ LÝ GHI ÂM ---
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      message.error("Trình duyệt không hỗ trợ nhận dạng giọng nói.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join("");

      setInputValue(transcript);

      if (silenceTimer.current) clearTimeout(silenceTimer.current);

      silenceTimer.current = setTimeout(() => {
        console.log("Phát hiện im lặng, tự động gửi...");
        recognition.stop();
        handleSend(transcript);
      }, SILENCE_TIMEOUT);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        message.error("Vui lòng cấp quyền Micro.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
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
            <div className="header-title">Trợ Lý Việt</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* TAG MODEL: Chỉ hiện icon sấm sét trên mobile, ẩn tên model */}
          <Tooltip title={`Mô hình đang dùng: ${usedModel}`}>
            <Tag
              style={{
                borderRadius: 20,
                padding: "4px 10px", // Giảm padding một chút
                border: "1px solid #C5E1A5",
                background: "#F1F8E9",
                color: "#33691E",
                fontFamily: "Be Vietnam Pro",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {/* Luôn hiện dấu sấm sét hoặc chấm xanh */}
              <span>{usedModel === "Ready" ? "●" : "⚡"}</span>

              {/* Ẩn tên model trên mobile */}
              <span className="mobile-hidden">
                {usedModel === "Ready" ? " Sẵn sàng" : usedModel}
              </span>
            </Tag>
          </Tooltip>

          {/* NÚT XÓA CHAT: Chỉ hiện icon thùng rác trên mobile */}
          {messages.length > 1 && (
            <Popconfirm
              title="Xóa lịch sử?"
              description="Bạn có chắc muốn xóa toàn bộ đoạn chat này không?"
              onConfirm={handleClearChat}
              okText="Xóa"
              cancelText="Hủy"
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                style={{ fontWeight: 500, padding: "4px 8px" }}
              >
                {/* Ẩn chữ "Xóa đoạn chat" trên mobile */}
                <span className="mobile-hidden">Xóa đoạn chat</span>
              </Button>
            </Popconfirm>
          )}
        </div>
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

        {isListening && (
          <div
            style={{
              textAlign: "center",
              marginBottom: 10,
              color: "#D4380D",
              animation: "fadeIn 0.3s",
            }}
          >
            <span className="pulsing-mic">●</span> Đang lắng nghe... (Tự gửi sau
            2s im lặng)
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
                handleSend(); // Gọi không tham số, nó sẽ dùng inputValue
              }
            }}
            placeholder={
              isListening ? "Đang ghi âm..." : "Nhập tin nhắn tại đây..."
            }
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="custom-textarea"
            disabled={loading}
          />
          <Button
            type="primary"
            onClick={() => handleSend()}
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
