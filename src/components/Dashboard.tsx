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
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

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

// Sub-component to handle Markdown rendering with Expand/Collapse toggle
const MarkdownCell: React.FC<{ content: string }> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        style={{
          // If expanded, show all. If not, limit height to mimic "rows: 3"
          maxHeight: expanded ? "none" : "64px",
          overflow: "hidden",
          position: "relative",
          // Add a subtle mask if collapsed to indicate more content
          maskImage: expanded
            ? "none"
            : "linear-gradient(to bottom, black 60%, transparent 100%)",
          WebkitMaskImage: expanded
            ? "none"
            : "linear-gradient(to bottom, black 60%, transparent 100%)",
        }}
      >
        <div
          className="markdown-body"
          style={{ fontSize: "13px", color: "#444" }}
        >
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            remarkPlugins={[remarkGfm]}
            components={{
              // Override specific elements if needed to fit table style
              p: ({ node, ...props }) => (
                <p style={{ marginBottom: "8px" }} {...props} />
              ),
              pre: ({ node, ...props }) => (
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: "8px",
                    borderRadius: "4px",
                    overflowX: "auto",
                  }}
                  {...props}
                />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
      <div style={{ marginTop: 4 }}>
        <Button
          type="link"
          onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}
          style={{ fontSize: 12 }}
        >
          {expanded ? "Thu gọn" : "Xem chi tiết"}
        </Button>
      </div>
    </div>
  );
};

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
      width: 500, // Increased width slightly for better Markdown readability
      render: (t: string) => <MarkdownCell content={t} />,
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
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 64px)",
        }}
      >
        <Card
          bordered={false}
          style={{
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          }}
          styles={{
            body: {
              padding: 24,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            },
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
                position: ["bottomCenter"],
                showSizeChanger: false,
              }}
              scroll={{ x: 1300, y: "calc(100vh - 300px)" }}
            />
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default Dashboard;
