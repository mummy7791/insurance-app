import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import api from "../services/api";

type ChatMessage = { role: "assistant" | "user"; text: string };

const QUICK = ["My premium status", "Claim help", "KYC help", "Insurance plans"];

export default function SecureLifeAIChat() {
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [messages,setMessages]=useState<ChatMessage[]>([
    { role:"assistant", text:"Hi! Welcome to SecureLife Chat. I can help with plans, premiums, claims, KYC and policy services." }
  ]);
  const user=useMemo(()=>{try{return JSON.parse(localStorage.getItem("insuranceUser")||"{}");}catch{return {}; }},[]);
  if(user.role && user.role!=="customer") return null;

  const ask=async(raw:string)=>{
    const question=raw.trim(); if(!question||busy)return;
    setMessages(m=>[...m,{role:"user",text:question}]); setInput(""); setBusy(true);
    try{
      const res=await api.post<{answer:string}>("/ai/ask",{question});
      setMessages(m=>[...m,{role:"assistant",text:res.data.answer||"I could not find an answer right now."}]);
    }catch{
      setMessages(m=>[...m,{role:"assistant",text:"I’m unable to connect right now. Please try again, or use Help & Support for assistance."}]);
    }finally{setBusy(false);}
  };
  const submit=(e:FormEvent)=>{e.preventDefault();void ask(input);};

  return <>
    {open&&<section className="securelife-ai-panel" aria-label="SecureLife Chat">
      <header><img src="/securelife-logo.jpg" alt="SecureLife"/><div><strong>SecureLife Chat</strong><small><i/> Online • Customer Support</small></div><button onClick={()=>setOpen(false)} aria-label="Close assistant">×</button></header>
      <div className="securelife-ai-messages">
        {messages.map((m,i)=><div key={i} className={"securelife-ai-message "+m.role}>{m.role==="assistant"&&<img src="/securelife-logo.jpg" alt=""/>}<span>{m.text}</span></div>)}
        {busy&&<div className="securelife-ai-typing">SecureLife Chat is typing…</div>}
      </div>
      <div className="securelife-ai-quick">{QUICK.map(q=><button key={q} onClick={()=>void ask(q)}>{q}</button>)}</div>
      <form onSubmit={submit}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about your insurance…" maxLength={300}/><button type="submit" disabled={busy||!input.trim()}>➤</button></form>
      <footer>Automated assistance may make mistakes. Verify important policy information.</footer>
    </section>}
    <button className={"securelife-ai-fab "+(open?"open":"")} onClick={()=>setOpen(v=>!v)} aria-label="Open SecureLife Chat">
      {open?"×":<><span>💬</span><b>Chat</b></>}
    </button>
  </>;
}
