import {
  Code2,
  Wifi,
  WifiOff,
  Users,
  LogOut,
  MessageSquare,
} from "lucide-react";

export default function Header({
  roomId,
  isConnected,
  users,
  userColors,
  leaveRoom,
  isChatOpen,
  toggleChat,
}) {
  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="font-medium">CodeBros</span>
          <span className="text-zinc-400 text-sm">Room {roomId}</span>
        </div>

        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm text-zinc-400">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-zinc-400" />
          {users.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center space-x-1 px-2 py-1 rounded-md text-sm"
              style={{
                backgroundColor: userColors[index % userColors.length] + "20",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: userColors[index % userColors.length],
                }}
              />
              <span style={{ color: userColors[index % userColors.length] }}>
                {user.name}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={toggleChat}
          className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
            isChatOpen
              ? "text-blue-400 bg-blue-500/10"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">Chat</span>
        </button>

        <button
          onClick={leaveRoom}
          className="flex items-center space-x-1 px-2 py-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Leave</span>
        </button>
      </div>
    </div>
  );
}
