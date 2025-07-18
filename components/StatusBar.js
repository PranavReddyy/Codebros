export default function StatusBar({ activeFile, roomId }) {
  return (
    <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-2 flex justify-between text-xs text-zinc-400">
      <div className="flex items-center space-x-3">
        <span>Ready</span>
        <span>•</span>
        <span>{activeFile?.language}</span>
        <span>•</span>
        <span>Room {roomId}</span>
      </div>
      <div className="flex items-center space-x-3">
        <span>{activeFile?.content?.split("\n").length || 0} lines</span>
        <span>•</span>
        <span>{activeFile?.content?.length || 0} characters</span>
      </div>
    </div>
  );
}
