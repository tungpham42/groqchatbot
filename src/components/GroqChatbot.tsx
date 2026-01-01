import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Layout,
  Input,
  Button,
  List,
  Avatar,
  Card,
  Spin,
  message,
  Popconfirm,
  Menu,
  Drawer,
} from "antd";
import {
  SendOutlined,
  UserOutlined,
  GlobalOutlined,
  SmileOutlined,
  HeartFilled,
  CommentOutlined,
  AudioOutlined,
  StopOutlined,
  DeleteOutlined,
  PlusOutlined,
  MessageOutlined,
  MenuOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";

const { Header, Content, Footer, Sider } = Layout;
const { TextArea } = Input;

// --- TYPES ---
type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
};

const GroqChatbot: React.FC = () => {
  // --- CẤU HÌNH ---
  const STORAGE_KEY = "groq_chat_sessions_v1";
  const SILENCE_TIMEOUT = 2000;

  const INITIAL_SYSTEM_MSG: Message = useMemo(
    () => ({
      role: "system",
      content:
        "Bạn là một trợ lý ảo thông thái, lịch sự và sử dụng tiếng Việt tự nhiên. Hãy trả lời ngắn gọn, đi vào trọng tâm.",
    }),
    []
  );

  // --- STATE ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // LOGIC 1: Lọc bỏ các session trống (chỉ có system message) ngay khi load
        return parsed.filter((s: ChatSession) => s.messages.length > 1);
      }
      return [];
    } catch {
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // --- REFS ---
  const recognitionRef = useRef<any>(null);
  const silenceTimer = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- HELPERS ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const currentMessages = useMemo(
    () =>
      sessions.find((s) => s.id === currentSessionId)?.messages || [
        INITIAL_SYSTEM_MSG,
      ],
    [sessions, currentSessionId, INITIAL_SYSTEM_MSG]
  );

  // --- EFFECTS ---
  useEffect(() => {
    // Chỉ lưu các session có nội dung thực tế (length > 1) vào localStorage
    // Điều này giúp dọn dẹp rác khi F5
    const validSessions = sessions.filter((s) => s.messages.length > 1);

    // Tuy nhiên, ta vẫn cần lưu session hiện tại vào state để UI không bị mất
    // nên ở đây ta chỉ lọc khi save xuống disk, hoặc save tất cả nhưng lọc khi load (như LOGIC 1)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validSessions));
  }, [sessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, isListening]);

  // Khởi tạo session đầu tiên nếu chưa có
  useEffect(() => {
    if (sessions.length === 0 && !currentSessionId) {
      // Tạo session mới nhưng không thông báo
      const newId = generateId();
      const newSession: ChatSession = {
        id: newId,
        title: "Đoạn chat mới",
        messages: [INITIAL_SYSTEM_MSG],
        lastUpdated: Date.now(),
      };
      setSessions([newSession]);
      setCurrentSessionId(newId);
    } else if (sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- ACTIONS ---

  // 1. Tạo đoạn chat mới (LOGIC 2: Tự động dọn dẹp)
  const handleNewChat = () => {
    // Kiểm tra xem session hiện tại có đang trống không
    const currentS = sessions.find((s) => s.id === currentSessionId);

    // Nếu session hiện tại chỉ có 1 tin nhắn (system), tái sử dụng nó
    if (currentS && currentS.messages.length <= 1) {
      setDrawerVisible(false);
      message.info("Đoạn chat hiện tại đã sẵn sàng");
      return;
    }

    // Nếu không, lọc bỏ bất kỳ session rác nào khác trước khi tạo mới
    const cleanSessions = sessions.filter((s) => s.messages.length > 1);

    const newSession: ChatSession = {
      id: generateId(),
      title: "Đoạn chat mới",
      messages: [INITIAL_SYSTEM_MSG],
      lastUpdated: Date.now(),
    };

    setSessions([newSession, ...cleanSessions]);
    setCurrentSessionId(newSession.id);
    setDrawerVisible(false);
    if (window.innerWidth < 768) message.success("Đã tạo đoạn chat mới");
  };

  // 2. Chọn đoạn chat từ lịch sử (LOGIC 3: Xóa session cũ nếu trống)
  const handleSelectSession = (targetId: string) => {
    // Trước khi chuyển, lọc danh sách để loại bỏ các session trống (trừ cái đích đến)
    // Điều này đảm bảo khi rời khỏi một session trống, nó sẽ biến mất
    const cleanSessions = sessions.filter(
      (s) => s.id === targetId || s.messages.length > 1
    );

    setSessions(cleanSessions);
    setCurrentSessionId(targetId);
    setDrawerVisible(false);
  };

  // 3. Xóa một đoạn chat cụ thể
  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);

    if (id === currentSessionId) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      } else {
        // Nếu xóa hết, tạo lại mới
        const newId = generateId();
        const newSession: ChatSession = {
          id: newId,
          title: "Đoạn chat mới",
          messages: [INITIAL_SYSTEM_MSG],
          lastUpdated: Date.now(),
        };
        setSessions([newSession]);
        setCurrentSessionId(newId);
      }
    }
    message.success("Đã xóa đoạn chat");
  };

  // 4. Gửi tin nhắn
  const handleSend = async (manualText?: string) => {
    const contentToSend =
      typeof manualText === "string" ? manualText : inputValue;
    if (!contentToSend.trim()) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    }

    if (!currentSessionId) return;

    const newUserMsg: Message = { role: "user", content: contentToSend };

    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSessionId) {
        const newTitle =
          s.title === "Đoạn chat mới"
            ? contentToSend.slice(0, 30) +
              (contentToSend.length > 30 ? "..." : "")
            : s.title;
        return {
          ...s,
          title: newTitle,
          messages: [...s.messages, newUserMsg],
          lastUpdated: Date.now(),
        };
      }
      return s;
    });

    updatedSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);

    setSessions(updatedSessions);
    setInputValue("");
    setLoading(true);

    try {
      const currentHistory =
        updatedSessions.find((s) => s.id === currentSessionId)?.messages || [];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: [
                ...s.messages,
                { role: "assistant", content: data.content },
              ],
            };
          }
          return s;
        })
      );
    } catch (error) {
      message.error("Lỗi kết nối.");
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: [
                ...s.messages,
                {
                  role: "assistant",
                  content: "🍃 **Lỗi:** Không thể kết nối tới server.",
                },
              ],
            };
          }
          return s;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  // --- VOICE ---
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
      message.error("Trình duyệt không hỗ trợ.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join("");
      setInputValue(transcript);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        recognition.stop();
        handleSend(transcript);
      }, SILENCE_TIMEOUT);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- RENDER SIDEBAR CONTENT ---
  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px" }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          size="large"
          className="new-chat-btn"
          onClick={handleNewChat}
        >
          Đoạn chat mới
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
        <div className="history-label">Gần đây</div>
        {/* Chỉ hiển thị các session có nội dung hoặc là session hiện tại */}
        <Menu
          mode="inline"
          selectedKeys={[currentSessionId || ""]}
          style={{ borderRight: 0, background: "transparent" }}
        >
          {sessions
            .filter((s) => s.messages.length > 1 || s.id === currentSessionId)
            .map((session) => (
              <Menu.Item
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className="history-item"
                style={{
                  height: "auto",
                  lineHeight: "1.5",
                  padding: "10px 15px",
                  marginBottom: 5,
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      overflow: "hidden",
                    }}
                  >
                    <MessageOutlined />
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 140,
                      }}
                    >
                      {session.title}
                    </span>
                  </div>

                  <Popconfirm
                    title="Xóa đoạn này?"
                    onConfirm={(e: any) => handleDeleteSession(e, session.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <Button
                      type="text"
                      size="small"
                      className="delete-session-btn"
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </div>
              </Menu.Item>
            ))}
        </Menu>
      </div>
    </div>
  );

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider
        width={280}
        className="desktop-sider"
        theme="light"
        breakpoint="md"
        collapsedWidth="0"
        trigger={null}
      >
        <SidebarContent />
      </Sider>

      <Drawer
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        <SidebarContent />
      </Drawer>

      <Layout className="site-layout">
        <Header className="chatbot-header">
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <Button
              className="mobile-menu-btn"
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
            />

            <div className="logo-circle">
              <GlobalOutlined style={{ fontSize: 20 }} />
            </div>
            <div className="header-title">Trợ Lý Việt</div>
          </div>
        </Header>

        <Content className="chatbot-content">
          {currentMessages.length === 1 && (
            <div className="welcome-screen">
              <div className="welcome-icon">
                <CommentOutlined style={{ fontSize: 36, color: "#3A7D44" }} />
              </div>
              <h2>Bắt đầu cuộc trò chuyện mới</h2>
              <p>Hãy hỏi tôi bất cứ điều gì...</p>
            </div>
          )}

          <List
            locale={{
              emptyText: (
                <div style={{ padding: "20px 0", color: "#A3B1A5" }}>
                  <InboxOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                  <div style={{ fontFamily: "Be Vietnam Pro", fontSize: 12 }}>
                    Chưa có gì! Hãy bắt đầu bằng cách gửi tin nhắn.
                  </div>
                </div>
              ),
            }}
            dataSource={currentMessages.filter((m) => m.role !== "system")}
            split={false}
            renderItem={(item) => (
              <div
                className={`message-row ${
                  item.role === "user" ? "user" : "ai"
                }`}
              >
                {item.role === "assistant" && (
                  <Avatar
                    className="avatar-ai"
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
                    className="avatar-user"
                    size={42}
                    icon={<UserOutlined />}
                  />
                )}
              </div>
            )}
          />

          {isListening && (
            <div className="listening-indicator">
              <span className="pulsing-mic">●</span> Đang nghe...
            </div>
          )}
          {loading && (
            <div className="loading-indicator">
              <Spin
                indicator={
                  <HeartFilled
                    style={{ fontSize: 14, color: "#D4A017", marginRight: 8 }}
                    spin
                  />
                }
              />
              Đang trả lời...
            </div>
          )}
          <div ref={bottomRef} />
        </Content>

        <Footer className="chatbot-footer">
          <div className="input-container">
            <Button
              type="text"
              shape="circle"
              onClick={toggleListening}
              className={isListening ? "mic-btn-active" : "mic-btn"}
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
              placeholder="Nhập tin nhắn..."
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
        </Footer>
      </Layout>
    </Layout>
  );
};

export default GroqChatbot;
