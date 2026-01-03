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
const { Title, Paragraph } = Typography;

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
      width: 150,
      render: (t: string) => dayjs(t).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "IP User",
      dataIndex: "user_ip",
      key: "user_ip",
      width: 140,
      render: (ip: string) => <Tag color="blue">{ip}</Tag>,
    },
    {
      title: "Session ID",
      dataIndex: "session_id",
      key: "session_id",
      width: 120,
      render: (id: string) => (
        <Typography.Text copyable={{ text: id }}>
          <span style={{ fontSize: 12, color: "#888" }}>
            {id.slice(0, 8)}...
          </span>
        </Typography.Text>
      ),
    },
    {
      title: "Người dùng hỏi",
      dataIndex: "user_message",
      key: "user_message",
      width: 300,
      render: (text: string) => (
        <Paragraph
          ellipsis={{
            rows: 2,
            expandable: true,
            symbol: "Xem thêm",
          }}
          style={{ marginBottom: 0, color: "#1677ff", fontWeight: 500 }}
        >
          {text}
        </Paragraph>
      ),
    },
    {
      title: "AI Trả lời",
      dataIndex: "ai_response",
      key: "ai_response",
      width: 400,
      render: (t: string) => (
        <Paragraph
          ellipsis={{
            rows: 3,
            expandable: true,
            symbol: "Xem chi tiết",
          }}
          style={{
            marginBottom: 0,
            color: "#444",
            whiteSpace: "pre-wrap",
            fontSize: 13,
          }}
        >
          {t}
        </Paragraph>
      ),
    },
  ];

  // Filter client-side
  const filteredData = logs.filter(
    (l) =>
      (l.user_message || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (l.ai_response || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (l.user_ip || "").includes(searchText)
  );

  return (
    <Layout style={{ height: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #ddd",
          height: 64,
          flexShrink: 0,
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

      <Content
        style={{
          padding: "20px",
          // Use flex column to fill height but don't hard-clip the bottom edge yet
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 64px)", // Explicit height minus header
        }}
      >
        <Card
          bordered={false}
          style={{
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            flex: 1, // Fill available space
            overflow: "hidden", // Keep card rounded corners clean
          }}
          bodyStyle={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            height: "100%", // Fill the card
          }}
        >
          <div style={{ flexShrink: 0, marginBottom: 16 }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm kiếm nội dung chat, IP..."
              style={{ maxWidth: 400 }}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={filteredData}
              loading={loading}
              pagination={{
                pageSize: 20,
                position: ["bottomCenter"], // Explicitly position at bottom
                showSizeChanger: false,
              }}
              // Adjusted calculation:
              // 100vh - Header(64) - CardPadding(48) - InputMB(16) - InputHeight(32) - Pagination(~60)
              // ~220px offset + safety margin.
              // 'max-content' or a slightly smaller calc ensures pagination is visible.
              scroll={{ x: 1200, y: "calc(100vh - 300px)" }}
            />
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default Dashboard;
