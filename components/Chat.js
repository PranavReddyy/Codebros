import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Bot, Code, Clipboard, Check } from "lucide-react";

export default function Chat({
  messages,
  onSendMessage,
  users,
  userColors,
  userId,
  activeFile,
}) {
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("group");
  const [aiMessages, setAiMessages] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const aiMessagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const scrollToBottom = () => {
    const ref = activeTab === "group" ? messagesEndRef : aiMessagesEndRef;
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiMessages, activeTab]);

  useEffect(() => {
    const textarea = chatInputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 128; // 8rem
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [chatInput]);

  const handleSend = async () => {
    const trimmedInput = chatInput.trim();
    if (!trimmedInput) return;

    if (activeTab === "group") {
      onSendMessage(trimmedInput);
    } else {
      const userMessage = {
        id: Date.now(),
        type: "user",
        text: trimmedInput,
        timestamp: Date.now(),
      };

      setAiMessages((prev) => [...prev, userMessage]);
      setIsAiLoading(true);

      try {
        const response = await fetch("http://localhost:3001/analyze-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage.text,
            context: {
              fileName: activeFile?.name || "untitled",
              code: activeFile?.content || "",
              language: activeFile?.language || "text",
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`AI service error: ${response.statusText}`);
        }

        const aiResponse = await response.json();
        const aiMessage = {
          id: Date.now() + 1,
          type: "ai",
          suggestion: aiResponse.suggestion,
          editedCode: aiResponse.edited_code,
          timestamp: Date.now(),
        };
        setAiMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error("AI request failed:", error);
        const errorMessage = {
          id: Date.now() + 1,
          type: "ai",
          suggestion:
            "Sorry, I'm currently unavailable. Please try again later.",
          timestamp: Date.now(),
        };
        setAiMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsAiLoading(false);
      }
    }
    setChatInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getUserColor = (msgUserId) => {
    const userIndex = users.findIndex((u) => u.id === msgUserId);
    return userColors[userIndex % userColors.length] || "#A1A1AA";
  };

  const copyCodeToClipboard = (code, messageId) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const renderGroupMessages = () => (
    <>
      {messages.length === 0 ? (
        <div className="text-center text-zinc-500 pt-10">
          <MessageSquare className="w-10 h-10 mx-auto mb-4" />
          <p className="font-medium">Group Chat</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.userId === userId ? "justify-end" : ""
            }`}
          >
            {msg.userId !== userId && (
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: getUserColor(msg.userId) }}
              >
                {msg.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className={`flex flex-col ${
                msg.userId === userId ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-xl max-w-xs ${
                  msg.userId === userId
                    ? "bg-blue-600 rounded-br-none"
                    : "bg-zinc-800 rounded-bl-none"
                }`}
              >
                {msg.userId !== userId && (
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: getUserColor(msg.userId) }}
                  >
                    {msg.username}
                  </p>
                )}
                <p className="text-sm text-zinc-100 break-words">{msg.text}</p>
              </div>
              <span className="text-xs text-zinc-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </>
  );

  const renderAiMessages = () => (
    <>
      {aiMessages.length === 0 ? (
        <div className="text-center text-zinc-500 pt-10">
          <Bot className="w-10 h-10 mx-auto mb-4" />
          <p className="font-medium">AI Assistant</p>
          <p className="text-sm">Ask me about your code!</p>
        </div>
      ) : (
        aiMessages.map((msg) => (
          <div key={msg.id}>
            {msg.type === "user" ? (
              <div className="flex justify-end">
                <div className="bg-blue-600 px-4 py-2 rounded-xl rounded-br-none max-w-xs">
                  <p className="text-sm text-white break-words">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="bg-zinc-800 px-4 py-3 rounded-xl rounded-bl-none">
                    <p className="text-sm text-zinc-100 mb-2 break-words">
                      {msg.suggestion}
                    </p>
                    {msg.editedCode && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-zinc-400 font-medium">
                            Improved Code:
                          </span>
                          <button
                            onClick={() =>
                              copyCodeToClipboard(msg.editedCode, msg.id)
                            }
                            className={`flex items-center space-x-1 text-xs transition-colors ${
                              copiedMessageId === msg.id
                                ? "text-green-400"
                                : "text-purple-400 hover:text-purple-300"
                            }`}
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Clipboard className="w-3 h-3" />
                            )}
                            <span>
                              {copiedMessageId === msg.id ? "Copied!" : "Copy"}
                            </span>
                          </button>
                        </div>
                        <pre className="bg-black/50 p-3 rounded text-xs text-zinc-200 overflow-x-auto border border-zinc-700">
                          <code>{msg.editedCode}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))
      )}
      {isAiLoading && (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-zinc-800 px-4 py-3 rounded-xl rounded-bl-none">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span className="text-xs text-zinc-400">Analyzing...</span>
            </div>
          </div>
        </div>
      )}
      <div ref={aiMessagesEndRef} />
    </>
  );

  return (
    <div className="w-100 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full">
      {/* Header: Stays at the top */}
      <div className="p-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveTab("group")}
            className={`w-1/2 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-2 ${
              activeTab === "group"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Group</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`w-1/2 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-2 ${
              activeTab === "ai"
                ? "bg-purple-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Message List: Takes up remaining space and scrolls */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {activeTab === "group" ? renderGroupMessages() : renderAiMessages()}
      </div>

      {/* Input Area: Stays at the bottom */}
      <div className="p-4 border-t border-zinc-800 flex-shrink-0">
        <div className="relative">
          <textarea
            ref={chatInputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              activeTab === "group"
                ? "Type a message..."
                : "Ask about your code..."
            }
            rows="1"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-4 pr-12 py-2 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isAiLoading}
          />
          <button
            onClick={handleSend}
            disabled={isAiLoading || !chatInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white hover:bg-blue-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {activeTab === "ai" && (
          <p className="text-xs text-zinc-500 mt-2 text-center">
            <Code className="w-3 h-3 inline mr-1" />
            Including {activeFile?.name || "current file"} as context
          </p>
        )}
      </div>
    </div>
  );
}
