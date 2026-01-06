require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./src/app");
const pollSocket = require("./src/sockets/poll.socket");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {origin: "*"},
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  pollSocket(io, socket);
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});