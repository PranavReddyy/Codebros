const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store rooms and their data
const rooms = new Map();
const userCursors = new Map();
const githubConfigs = new Map(); // roomId → { token, owner, repo, branch }

const SESSIONS_DIR = path.join(__dirname, "sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR);
}

// Helper functions for file persistence
function getRoomPath(roomId) {
  return path.join(SESSIONS_DIR, roomId);
}

function persistFilesToDisk(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const dir = getRoomPath(roomId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  room.files.forEach((file) => {
    fs.writeFileSync(path.join(dir, file.name), file.content, "utf-8");
  });
}

wss.on("connection", (ws) => {
  let currentRoom = null;
  let currentUser = null;

  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received:", data.type, data);

      switch (data.type) {
        case "join-room":
          currentRoom = data.roomId;
          currentUser = { id: data.userId, name: data.username, ws };

          // Initialize room if doesn't exist
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, {
              users: new Map(),
              files: [
                {
                  id: 1,
                  name: "index.html",
                  content:
                    "<!DOCTYPE html>\n<html>\n<head>\n  <title>Hello World</title>\n</head>\n<body>\n  <h1>Hello CodeBros!</h1>\n</body>\n</html>",
                  active: true,
                },
              ],
              messages: [],
            });
          }

          const room = rooms.get(currentRoom);
          room.users.set(data.userId, currentUser);

          console.log(`User ${data.username} joined room ${currentRoom}`);

          // Send current state to new user
          ws.send(
            JSON.stringify({
              type: "room-state",
              files: room.files,
              users: Array.from(room.users.values()).map((u) => ({
                id: u.id,
                name: u.name,
              })),
              messages: room.messages || [],
              githubConnected: githubConfigs.has(currentRoom),
            })
          );

          // Notify others about new user
          broadcastToRoom(
            currentRoom,
            {
              type: "user-joined",
              user: { id: currentUser.id, name: currentUser.name },
            },
            data.userId
          );
          break;

        case "github-connect":
          if (currentRoom) {
            const { token, repoFullName, branch } = data;
            const [owner, repo] = repoFullName.split("/");
            githubConfigs.set(currentRoom, {
              token,
              owner,
              repo,
              branch: branch || "main",
            });

            broadcastToRoom(currentRoom, {
              type: "github-connected",
              repoFullName,
              branch: branch || "main",
            });
          }
          break;

        case "github-commit":
          if (currentRoom && githubConfigs.has(currentRoom)) {
            handleGitHubCommit(currentRoom, data.commitMessage, ws);
          } else {
            ws.send(
              JSON.stringify({
                type: "commit-error",
                error: "GitHub not configured for this room",
              })
            );
          }
          break;

        // ... existing cases (code-change, cursor-position, etc.) remain the same ...
        case "code-change":
          if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            const fileIndex = room.files.findIndex((f) => f.id === data.fileId);
            if (fileIndex !== -1) {
              room.files[fileIndex].content = data.code;
              console.log(
                `Code updated in file ${data.fileId} by ${currentUser.name}`
              );
            }

            broadcastToRoom(
              currentRoom,
              {
                type: "code-update",
                code: data.code,
                fileId: data.fileId,
                userId: data.userId,
              },
              data.userId
            );
          }
          break;

        case "cursor-position":
          if (currentRoom && currentUser) {
            broadcastToRoom(
              currentRoom,
              {
                type: "cursor-update",
                pos: data.pos,
                fileId: data.fileId,
                userId: data.userId,
                username: data.username,
              },
              data.userId
            );
          }
          break;

        case "file-switch":
          if (currentRoom && rooms.has(currentRoom)) {
            broadcastToRoom(
              currentRoom,
              {
                type: "file-switched",
                fileId: data.fileId,
                userId: data.userId,
              },
              data.userId
            );
          }
          break;

        case "file-create":
          if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            const newFile = {
              id: Date.now(),
              name: data.fileName,
              content: "",
              active: false,
            };

            room.files.push(newFile);

            broadcastToRoom(currentRoom, {
              type: "file-created",
              file: newFile,
            });
          }
          break;

        case "send-chat-message":
          if (currentRoom && rooms.has(currentRoom) && currentUser) {
            const room = rooms.get(currentRoom);
            const newMessage = {
              id: Date.now(),
              userId: currentUser.id,
              username: currentUser.name,
              text: data.text,
              timestamp: Date.now(),
            };

            if (!room.messages) {
              room.messages = [];
            }
            room.messages.push(newMessage);

            console.log(`Chat message from ${currentUser.name}: ${data.text}`);

            broadcastToRoom(currentRoom, {
              type: "new-chat-message",
              message: newMessage,
            });
          }
          break;

        case "leave-room":
          if (currentRoom && rooms.has(currentRoom) && currentUser) {
            const room = rooms.get(currentRoom);
            room.users.delete(data.userId);

            broadcastToRoom(
              currentRoom,
              {
                type: "user-left",
                userId: data.userId,
              },
              data.userId
            );
          }
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(currentUser.id);
        broadcastToRoom(
          currentRoom,
          {
            type: "user-left",
            userId: currentUser.id,
          },
          currentUser.id
        );
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

async function handleGitHubCommit(roomId, commitMessage, ws) {
  const cfg = githubConfigs.get(roomId);
  const roomPath = getRoomPath(roomId);

  try {
    // Persist files to disk
    persistFilesToDisk(roomId);

    // Setup git
    const git = simpleGit(roomPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      await git.init();
      const remoteUrl = `https://${cfg.token}@github.com/${cfg.owner}/${cfg.repo}.git`;
      await git.addRemote("origin", remoteUrl);
    }

    // Add, commit, and push
    await git.add("./*");
    await git.commit(commitMessage);
    await git.push("origin", cfg.branch);

    // Get latest commit info
    const log = await git.log({ n: 1 });

    broadcastToRoom(roomId, {
      type: "commit-success",
      commitMessage,
      commitHash: log.latest.hash.substring(0, 7),
      author: log.latest.author_name,
    });
  } catch (error) {
    console.error("GitHub commit failed:", error);
    ws.send(
      JSON.stringify({
        type: "commit-error",
        error: error.message,
      })
    );
  }
}

function broadcastToRoom(roomId, message, excludeUserId = null) {
  const room = rooms.get(roomId);
  if (room) {
    let sentCount = 0;
    room.users.forEach((user, userId) => {
      if (userId !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify(message));
        sentCount++;
      }
    });
    console.log(
      `Broadcasted ${message.type} to ${sentCount} users in room ${roomId}`
    );
  }
}

server.listen(8080, () => {
  console.log("WebSocket server running on port 8080");
});
