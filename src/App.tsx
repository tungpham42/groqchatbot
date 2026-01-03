import React, { useState } from "react";
import GroqChatbot from "./components/GroqChatbot";
import Dashboard from "./components/Dashboard";
import { Button, Modal, Input, message } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import "./App.css";

const App: React.FC = () => {
  const [view, setView] = useState<"chat" | "dashboard">("chat");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");

  const handleLoginDashboard = () => {
    if (password === "lopcd2") {
      setView("dashboard");
      setIsModalOpen(false);
      setPassword("");
      message.success("Xin chào Admin!");
    } else {
      message.error("Mật khẩu không đúng");
    }
  };

  return (
    <div className="App" style={{ position: "relative", height: "100dvh" }}>
      {/* Nút vào Dashboard (Nằm ẩn ở góc dưới bên trái) */}
      {view === "chat" && (
        <Button
          type="text"
          icon={<SettingOutlined />}
          style={{
            position: "fixed",
            bottom: 10,
            left: 10,
            zIndex: 9999,
            opacity: 0.3,
          }}
          onClick={() => setIsModalOpen(true)}
        />
      )}

      {view === "chat" ? (
        <GroqChatbot />
      ) : (
        <Dashboard onBack={() => setView("chat")} />
      )}

      <Modal
        title="Đăng nhập Dashboard"
        open={isModalOpen}
        onOk={handleLoginDashboard}
        onCancel={() => setIsModalOpen(false)}
        okText="Đăng nhập"
        cancelText="Hủy"
      >
        <Input.Password
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleLoginDashboard}
        />
      </Modal>
    </div>
  );
};

export default App;
