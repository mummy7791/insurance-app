import { io } from "socket.io-client";

const SOCKET_URL = "https://insurance-app-7vkn.onrender.com";

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export default socket;