"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, Users } from "lucide-react";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const router = useRouter();

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (username.trim()) {
      router.push(
        `/room/${newRoomId}?username=${encodeURIComponent(username)}`
      );
    }
  };

  const joinRoom = () => {
    if (roomId.trim() && username.trim()) {
      router.push(`/room/${roomId}?username=${encodeURIComponent(username)}`);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === "Enter") {
      action();
    }
  };

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-xs text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">CodeBros</h1>
          <p className="text-zinc-400">
            A real-time collaborative code editor.
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-left">
          <div className="mb-6">
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyPress={(e) => handleKeyPress(e, createRoom)}
            />
          </div>

          <div className="mb-6">
            <button
              onClick={createRoom}
              disabled={!username.trim()}
              className="w-full group bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-zinc-900 text-zinc-500">or</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-center tracking-widest"
                onKeyPress={(e) => handleKeyPress(e, joinRoom)}
              />
            </div>

            <button
              onClick={joinRoom}
              disabled={
                !roomId.trim() || !username.trim() || roomId.length !== 6
              }
              className="w-full group bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Join Room</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
