"use client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import Editor from "../../../components/Editor";
import StatusBar from "../../../components/StatusBar";
import AddFileModal from "../../../components/AddFileModal";
import Chat from "../../../components/Chat";

export default function Room() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId;
  const username = searchParams.get("username");
  const userId = useRef(Math.random().toString(36).substring(7));

  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([
    {
      id: 1,
      name: "index.html",
      content:
        "<!DOCTYPE html>\n<html>\n<head>\n  <title>Hello World</title>\n</head>\n<body>\n  <h1>Hello CodeBros!</h1>\n</body>\n</html>",
      active: true,
      language: "html",
    },
  ]);
  const [activeFile, setActiveFile] = useState(files[0]);
  const [cursors, setCursors] = useState(new Map());
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepo, setGithubRepo] = useState(null);

  const wsRef = useRef(null);

  // ... existing color palette and helper functions remain the same ...
  const userColors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#14b8a6",
  ];

  const getLanguageFromFileName = (fileName) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return "javascript";
      case "py":
        return "python";
      case "html":
      case "htm":
        return "html";
      case "css":
      case "scss":
        return "css";
      default:
        return "html";
    }
  };

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket("ws://localhost:8080");

        wsRef.current.onopen = () => {
          setIsConnected(true);
          wsRef.current.send(
            JSON.stringify({
              type: "join-room",
              roomId,
              userId: userId.current,
              username,
            })
          );
        };

        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("Received message:", data.type, data);

          switch (data.type) {
            case "room-state":
              const roomFiles = data.files.map((f) => ({
                ...f,
                language: getLanguageFromFileName(f.name),
              }));
              setFiles(roomFiles);
              setUsers(data.users);
              setGithubConnected(data.githubConnected || false);

              if (data.messages) {
                setMessages(data.messages);
              }

              const activeFileData =
                roomFiles.find((f) => f.active) || roomFiles[0];
              setActiveFile(activeFileData);
              break;

            case "github-connected":
              setGithubConnected(true);
              setGithubRepo({ name: data.repoFullName, branch: data.branch });
              break;

            case "commit-success":
              // Show success notification or update UI
              console.log(`Commit successful: ${data.commitHash}`);
              break;

            case "commit-error":
              console.error("Commit failed:", data.error);
              alert(`Commit failed: ${data.error}`);
              break;

            // ... all existing cases remain the same ...
            case "user-joined":
              setUsers((prev) => [
                ...prev.filter((u) => u.id !== data.user.id),
                data.user,
              ]);
              break;

            case "user-left":
              setUsers((prev) => prev.filter((u) => u.id !== data.userId));
              setCursors((prev) => {
                const newCursors = new Map(prev);
                newCursors.delete(data.userId);
                return newCursors;
              });
              break;

            case "code-update":
              if (data.userId !== userId.current) {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === data.fileId ? { ...f, content: data.code } : f
                  )
                );
              }
              break;

            case "cursor-update":
              if (data.userId !== userId.current) {
                setCursors((prev) => {
                  const newCursors = new Map(prev);
                  newCursors.set(data.userId, {
                    username: data.username,
                    pos: data.pos,
                    fileId: data.fileId,
                  });
                  return newCursors;
                });
              }
              break;

            case "file-created":
              setFiles((prev) => [
                ...prev,
                {
                  ...data.file,
                  language: getLanguageFromFileName(data.file.name),
                },
              ]);
              break;

            case "file-switched":
              if (data.userId !== userId.current) {
                setFiles((prev) =>
                  prev.map((f) => ({ ...f, active: f.id === data.fileId }))
                );
                const newActiveFile = files.find((f) => f.id === data.fileId);
                if (newActiveFile) setActiveFile(newActiveFile);
              }
              break;

            case "new-chat-message":
              setMessages((prev) => [...prev, data.message]);
              break;
          }
        };

        wsRef.current.onclose = () => {
          setIsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error("WebSocket connection failed:", error);
        setIsConnected(false);
      }
    };

    connectWebSocket();
    return () => wsRef.current?.close();
  }, [roomId, username]);

  // GitHub functions
  const handleGitHubConnect = (repoFullName, branch) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "github-connect",
          repoFullName,
          branch,
        })
      );
    }
    setIsGitHubModalOpen(false);
  };

  const handleCommit = (commitMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "github-commit",
          commitMessage,
        })
      );
    }
  };

  // ... all existing functions remain the same ...
  const switchFile = (file) => {
    if (file.id === activeFile?.id) return;
    setFiles((prev) => prev.map((f) => ({ ...f, active: f.id === file.id })));
    setActiveFile(file);
    setCursors(new Map());
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "file-switch",
          fileId: file.id,
          userId: userId.current,
        })
      );
    }
  };

  const addFile = () => setIsAddFileModalOpen(true);

  const handleCreateFile = (fileName) => {
    if (fileName?.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "file-create",
          fileName: fileName.trim(),
        })
      );
    }
    setIsAddFileModalOpen(false);
  };

  const leaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "leave-room",
          userId: userId.current,
        })
      );
      wsRef.current.close();
    }
    router.push("/");
  };

  const handleSendMessage = (text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "send-chat-message",
          text,
        })
      );
    }
  };

  const sendCodeChange = (code) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "code-change",
          code,
          fileId: activeFile?.id,
          userId: userId.current,
        })
      );
    }
  };

  const sendCursorPosition = (pos) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "cursor-position",
          pos,
          fileId: activeFile?.id,
          userId: userId.current,
          username,
        })
      );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      <Header
        roomId={roomId}
        isConnected={isConnected}
        users={users}
        userColors={userColors}
        leaveRoom={leaveRoom}
        isChatOpen={isChatOpen}
        toggleChat={() => setIsChatOpen(!isChatOpen)}
        githubConnected={githubConnected}
        githubRepo={githubRepo}
        onGitHubConnect={() => setIsGitHubModalOpen(true)}
        onCommit={handleCommit}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          files={files}
          activeFile={activeFile}
          switchFile={switchFile}
          addFile={addFile}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Editor
            activeFile={activeFile}
            files={files}
            setFiles={setFiles}
            users={users}
            cursors={cursors}
            userColors={userColors}
            userId={userId.current}
            username={username}
            sendCodeChange={sendCodeChange}
            sendCursorPosition={sendCursorPosition}
          />
          <StatusBar activeFile={activeFile} roomId={roomId} />
        </div>

        {isChatOpen && (
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            users={users}
            userColors={userColors}
            userId={userId.current}
            activeFile={activeFile}
          />
        )}
      </div>

      {isAddFileModalOpen && (
        <AddFileModal
          onClose={() => setIsAddFileModalOpen(false)}
          onCreate={handleCreateFile}
        />
      )}
    </div>
  );
}
