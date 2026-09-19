import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL || "https://insurance-app-7vkn.onrender.com";

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: false,
});

export const connectSocket = () => {
  const token = localStorage.getItem("insuranceToken");

  if (!token) {
    socket.disconnect();
    return;
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;
