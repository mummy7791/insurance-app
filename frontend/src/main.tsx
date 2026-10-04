import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

function MobileNetworkGate() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return <App />;

  return (
    <main
      role="alert"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f5faf6",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#102a1b",
        textAlign: "center",
      }}
    >
      <section style={{ width: "min(100%, 390px)" }}>
        <img
          src="/securelife-logo.jpg"
          alt="SecureLife Insurance"
          style={{ width: "88px", height: "88px", objectFit: "contain", borderRadius: "22px", marginBottom: "18px" }}
        />
        <h1 style={{ margin: "0 0 10px", fontSize: "26px" }}>No Internet Connection</h1>
        <p style={{ margin: "0 0 22px", lineHeight: 1.6, color: "#587063" }}>
          Please check your mobile data or Wi-Fi connection and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            if (navigator.onLine) setOnline(true);
            else window.location.reload();
          }}
          style={{
            width: "100%",
            minHeight: "50px",
            border: 0,
            borderRadius: "12px",
            background: "#07883f",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Retry Connection
        </button>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MobileNetworkGate />
  </React.StrictMode>
);
