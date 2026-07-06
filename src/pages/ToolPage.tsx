import { useParams, Navigate } from "react-router-dom";
import App from "../App";
import ChatPdfPage from "./ChatPdfPage";
import { TOOLS } from "../data/catalog";

export default function ToolPage() {
  const { toolId } = useParams();
  if (toolId === "chat-pdf") return <ChatPdfPage />;
  const tool = TOOLS.find((t) => t.id === toolId);
  if (!tool) return <Navigate to="/" replace />;
  if (tool.operation === "chat") return <ChatPdfPage />;
  return <App tool={tool} />;
}
