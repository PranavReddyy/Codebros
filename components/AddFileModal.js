import { useState, useEffect, useRef } from "react";
import { FilePlus, X } from "lucide-react";

export default function AddFileModal({ onClose, onCreate }) {
  const [fileName, setFileName] = useState("");
  const inputRef = useRef(null);

  // Focus the input field when the modal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreate = () => {
    if (fileName.trim()) {
      onCreate(fileName.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleCreate();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={onClose} // Close on overlay click
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-8 m-4 text-white animate-slideUp"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
        onKeyDown={handleKeyPress}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <FilePlus className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold">Create New File</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <label
            htmlFor="fileName"
            className="block text-sm font-medium text-zinc-400 mb-2"
          >
            File Name
          </label>
          <input
            ref={inputRef}
            id="fileName"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="e.g., styles.css, script.js"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!fileName.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FilePlus className="w-4 h-4" />
            <span>Create File</span>
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
