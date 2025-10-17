// server/game.js

function setupSocket(io) {
  console.log("Socket setup started");

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

    // You can add more game events here
    socket.on("move", (data) => {
      console.log("Player move:", data);
      // broadcast move to other players
      socket.broadcast.emit("move", data);
    });
  });
}

module.exports = { setupSocket };
