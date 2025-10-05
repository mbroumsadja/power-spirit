// Connect to the Socket.IO server (change URL if needed)
const socket = io("http://localhost:3000");

// Listen for connection
socket.on("connect", () => {
    console.log("Connected to server, socket id:", socket.id);
});

// Listen for messages from server
socket.on("message", (data) => {
    console.log("Received message:", data);
});

// Send a message to the server
function sendMessage(msg) {
    socket.emit("message", msg);
}

// Example usage
sendMessage("Hello from client!");