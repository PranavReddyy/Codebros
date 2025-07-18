import { Plus, FileText, FileCode, Palette, FileIcon } from "lucide-react";

export default function Sidebar({ files, activeFile, switchFile, addFile }) {
  const getFileIcon = (fileName) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return <FileCode className="w-4 h-4 text-yellow-500" />;
      case "html":
      case "htm":
        return <FileText className="w-4 h-4 text-orange-500" />;
      case "css":
      case "scss":
        return <Palette className="w-4 h-4 text-blue-500" />;
      case "py":
        return <FileCode className="w-4 h-4 text-green-500" />;
      default:
        return <FileIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
        <span className="text-sm font-medium text-zinc-200">Files</span>
        <button
          onClick={addFile}
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-2 space-y-1">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => switchFile(file)}
            className={`flex items-center space-x-2 px-2 py-2 rounded cursor-pointer transition-colors ${
              file.active || file.id === activeFile?.id
                ? "bg-blue-600/20 text-blue-300 border border-blue-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {getFileIcon(file.name)}
            <span className="text-sm truncate">{file.name}</span>
            {(file.active || file.id === activeFile?.id) && (
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ml-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
