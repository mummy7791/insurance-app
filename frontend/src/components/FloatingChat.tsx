import { useState } from "react";

type Message = {
  from: "bot" | "user";
  text: string;
};

const getBotReply = (question: string) => {
  const q = question.toLowerCase();

  if (q.includes("claim")) {
    return "You can file or track your claim from the Claims section. Please keep your policy number ready.";
  }

  if (q.includes("renew")) {
    return "You can renew your policy from the Renewals section using your policy number or registered mobile number.";
  }

  if (q.includes("health")) {
    return "For health insurance, you can select Elevate, add members, enter contact details and get a quote.";
  }

  if (q.includes("car") || q.includes("motor")) {
    return "For car insurance, enter your registration number, mobile number and email to get a quick quote.";
  }

  if (q.includes("contact") || q.includes("support")) {
    return "You can contact support at 1800 2666. Support is available 24 x 7.";
  }

  return "I can help you with insurance quotes, renewals, claims, health insurance, car insurance and policy details.";
};

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "Hello 👋 I am RIA. How can I help you today?",
    },
  ]);

  const sendMessage = () => {
    const text = input.trim();

    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { from: "user", text },
      { from: "bot", text: getBotReply(text) },
    ]);

    setInput("");
  };

  return (
    <>
      <button className="chat-bubble" onClick={() => setOpen(true)}>
        ASK RIA
        <br />
        LIVE CHAT
      </button>

      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div>
              <h3>ASK RIA</h3>
              <p>AI Insurance Assistant</p>
            </div>

            <button onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="chat-body">
            {messages.map((msg, index) => (
              <div
                key={`${msg.from}-${index}`}
                className={`chat-msg ${msg.from}`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              value={input}
              placeholder="Ask about claims, renewals..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />

            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}