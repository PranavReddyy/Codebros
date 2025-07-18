import { useRef, useEffect, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { FileText, FileCode, Palette, FileIcon } from "lucide-react";

export default function Editor({
  activeFile,
  files,
  setFiles,
  users,
  cursors,
  userColors,
  userId,
  username,
  sendCodeChange,
  sendCursorPosition,
}) {
  const editorRef = useRef(null);
  const suppressUpdate = useRef(false);
  const debounceTimeout = useRef(null);
  const cursorTimeout = useRef(null);

  // Derive the most up-to-date file object from the `files` array.
  // This prevents issues with stale `activeFile` props.
  const currentFile = files.find((f) => f.id === activeFile?.id) || activeFile;

  // This effect syncs incoming remote changes to the editor.
  useEffect(() => {
    if (currentFile && editorRef.current?.view) {
      const editorView = editorRef.current.view;
      const editorContent = editorView.state.doc.toString();

      if (editorContent !== currentFile.content) {
        suppressUpdate.current = true;
        editorView.dispatch({
          changes: {
            from: 0,
            to: editorContent.length,
            insert: currentFile.content || "",
          },
        });
        setTimeout(() => {
          suppressUpdate.current = false;
        }, 50);
      }
    }
  }, [currentFile?.content, currentFile?.id]); // Depend directly on the content

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

  const getLanguageExtension = (fileName) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return javascript();
      case "py":
        return python();
      case "html":
      case "htm":
        return html();
      case "css":
      case "scss":
        return css();
      default:
        return html();
    }
  };

  // Enhanced Figma-style cursor widget
  class CursorWidget extends WidgetType {
    constructor(username, color) {
      super();
      this.username = username;
      this.color = color;
    }

    toDOM() {
      const wrapper = document.createElement("span");
      wrapper.style.cssText =
        "position: relative; display: inline-block; vertical-align: text-top;";

      const cursor = document.createElement("div");
      cursor.style.cssText = `position: absolute; top: 0; left: -1px; width: 2px; height: 1.2em; background: ${this.color}; z-index: 99;`;

      const label = document.createElement("div");
      label.textContent = this.username;
      label.style.cssText = `position: absolute; top: -1.5em; left: -1px; background: ${this.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; font-family: sans-serif;`;

      wrapper.appendChild(cursor);
      wrapper.appendChild(label);
      return wrapper;
    }
  }

  // Cursor management
  const updateCursorsEffect = StateEffect.define();
  const cursorField = StateField.define({
    create: () => Decoration.none,
    update(decorations, tr) {
      decorations = decorations.map(tr.changes);
      for (let effect of tr.effects) {
        if (effect.is(updateCursorsEffect)) {
          const builder = new RangeSetBuilder();
          const {
            cursors: currentCursors,
            activeFileId,
            usersList,
          } = effect.value;
          currentCursors.forEach((cursor, cursorUserId) => {
            if (cursorUserId !== userId && cursor.fileId === activeFileId) {
              const pos = Math.min(
                Math.max(0, cursor.pos),
                tr.state.doc.length
              );
              const userIndex = usersList.findIndex(
                (u) => u.id === cursorUserId
              );
              const color =
                userColors[userIndex % userColors.length] || "#6366f1";
              builder.add(
                pos,
                pos,
                Decoration.widget({
                  widget: new CursorWidget(cursor.username, color),
                  side: 1,
                })
              );
            }
          });
          return builder.finish();
        }
      }
      return decorations;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  // Update cursor decorations
  useEffect(() => {
    if (editorRef.current?.view) {
      editorRef.current.view.dispatch({
        effects: updateCursorsEffect.of({
          cursors,
          activeFileId: currentFile?.id,
          usersList: users,
        }),
      });
    }
  }, [cursors, currentFile?.id, users]);

  // Handle local code changes
  const handleCodeChange = useCallback(
    (value) => {
      if (suppressUpdate.current) return;
      setFiles((prev) =>
        prev.map((file) =>
          file.id === currentFile?.id ? { ...file, content: value } : file
        )
      );
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(() => sendCodeChange(value), 200);
    },
    [currentFile?.id, sendCodeChange, setFiles]
  );

  // Handle local cursor position changes
  const handleCursorChange = useCallback(
    (viewUpdate) => {
      if (suppressUpdate.current || !viewUpdate.selectionSet) return;
      const pos = viewUpdate.state.selection.main.head;
      clearTimeout(cursorTimeout.current);
      cursorTimeout.current = setTimeout(() => sendCursorPosition(pos), 50);
    },
    [sendCursorPosition]
  );

  return (
    <div className="flex-1 flex flex-col bg-black">
      {/* Editor Header */}
      <div className="bg-zinc-900/95 border-b border-zinc-800 px-4 py-3 flex justify-between items-center backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          {getFileIcon(currentFile?.name)}
          <span className="text-sm font-medium text-zinc-100">
            {currentFile?.name}
          </span>
          <span className="text-xs px-2 py-1 bg-zinc-800 rounded-md text-zinc-400 capitalize">
            {currentFile?.language}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs text-zinc-400">
            {users.length} collaborator{users.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center space-x-1">
            {Array.from(cursors.entries())
              .filter(([_, cursor]) => cursor.fileId === currentFile?.id)
              .slice(0, 5)
              .map(([cursorUserId, cursor]) => {
                const userIndex = users.findIndex((u) => u.id === cursorUserId);
                const color = userColors[userIndex % userColors.length];
                return (
                  <div
                    key={cursorUserId}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                    title={`${cursor.username} is editing`}
                  />
                );
              })}
          </div>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 bg-black overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={currentFile?.content || ""}
          height="100%"
          theme={oneDark}
          extensions={[
            getLanguageExtension(currentFile?.name),
            cursorField,
            EditorView.updateListener.of(handleCursorChange),
            EditorView.theme({
              "&": {
                fontSize: "14px",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                height: "100%",
              },
              ".cm-content": { padding: "20px", backgroundColor: "#0a0a0a" },
              ".cm-scroller": { lineHeight: "1.6" },
              ".cm-gutters": {
                backgroundColor: "#0a0a0a",
                borderRight: "1px solid #27272a",
              },
              ".cm-lineNumbers": { color: "#52525b" },
              ".cm-activeLineGutter, .cm-activeLine": {
                backgroundColor: "#18181b",
              },
            }),
          ]}
          onChange={handleCodeChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            bracketMatching: true,
            autocompletion: true,
          }}
        />
      </div>
    </div>
  );
}
