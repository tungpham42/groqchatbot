import React, { useEffect, useState } from "react";
import {
  Table,
  Layout,
  Typography,
  Tag,
  Button,
  Input,
  Space,
  Card,
  message,
} from "antd";
import {
  ReloadOutlined,
  HomeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Header, Content } = Layout;
const { Title } = Typography;

interface ChatLog {
  id: number;
  created_at: string;
  user_ip: string;
  session_id: string;
  user_message: string;
  ai_response: string;
}

interface DashboardProps {
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Gọi về Netlify Function kèm mật khẩu admin
      const res = await fetch(
        `/api/get-logs?secret=${process.env.REACT_APP_DASHBOARD_PASSWORD}`
      );
      if (!res.ok) throw new Error("Lỗi xác thực hoặc server");
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      message.error("Không thể tải dữ liệu logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    {
      title: "Thời gian",
      dataIndex: "created_at",
      key: "created_at",
      width: 140,
      render: (t: string) => dayjs(t).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "IP User",
      dataIndex: "user_ip",
      key: "user_ip",
      width: 130,
      render: (ip: string) => <Tag color="blue">{ip}</Tag>,
    },
    {
      title: "Session ID",
      dataIndex: "session_id",
      key: "session_id",
      width: 100,
      render: (id: string) => (
        <span style={{ fontSize: 12, color: "#888" }}>{id.slice(0, 8)}...</span>
      ),
    },
    {
      title: "Người dùng hỏi",
      dataIndex: "user_message",
      key: "user_message",
      width: "30%",
      render: (text: string) => <b style={{ color: "#1677ff" }}>{text}</b>,
    },
    {
      title: "AI Trả lời",
      dataIndex: "ai_response",
      key: "ai_response",
      render: (t: string) => (
        <div
          style={{
            maxHeight: 80,
            overflowY: "auto",
            fontSize: 13,
            color: "#444",
          }}
        >
          {t}
        </div>
      ),
    },
  ];

  // Filter dữ liệu client-side
  const filteredData = logs.filter(
    (l) =>
      (l.user_message || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (l.ai_response || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (l.user_ip || "").includes(searchText)
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #ddd",
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          📊 Dashboard Quản Lý
        </Title>
        <Space>
          <Button icon={<HomeOutlined />} onClick={onBack}>
            Về Chatbot
          </Button>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchLogs}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: "20px" }}>
        <Card
          bordered={false}
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
        >
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm kiếm nội dung chat, IP..."
            style={{ marginBottom: 20, maxWidth: 400 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default Dashboard;
