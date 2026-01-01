import React from "react";
import GroqChatbot from "./components/GroqChatbot";
import "./App.css"; // Nếu có style mặc định thì có thể xóa hoặc giữ

const App: React.FC = () => {
  return (
    <div className="App">
      <GroqChatbot />
    </div>
  );
};

export default App;
