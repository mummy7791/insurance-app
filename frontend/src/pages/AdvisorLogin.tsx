import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Auth.css";

type LoginResponse = { token:string; user:{ id:string; name:string; email:string; role:string; phone?:string; advisorCode?:string; address?:string; permissions?:string[] } };
const message=(e:unknown)=>{ if(typeof e==="object"&&e!==null&&"response" in e){const x=e as {response?:{data?:{message?:string}}};return x.response?.data?.message||"Advisor login failed";} return "Advisor login failed"; };

export default function AdvisorLogin(){
 const navigate=useNavigate(); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [show,setShow]=useState(false); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 const login=async()=>{ if(!email.trim()||!password)return setError("Email and password required");
  try{setLoading(true);setError("");const res=await api.post<LoginResponse>("/auth/login",{email:email.trim().toLowerCase(),password});
   if(res.data.user.role!=="advisor"){localStorage.removeItem("insuranceToken");localStorage.removeItem("insuranceUser");return setError("This portal is only for advisor accounts.");}
   localStorage.setItem("insuranceToken",res.data.token);localStorage.setItem("insuranceUser",JSON.stringify(res.data.user));navigate("/insurance-plans",{replace:true});
  }catch(e){setError(message(e));}finally{setLoading(false);}
 };
 return <div className="auth-shell staff-auth-shell"><section className="auth-visual staff-auth-visual"><Link className="auth-brand" to="/"><span className="auth-brand-mark">S</span><span>SecureLife</span></Link><div className="auth-visual-copy"><span className="auth-kicker">ADVISOR PORTAL</span><h1>Your plans, business and commission in one place.</h1><p>Secure advisor access to insurance plans, commission settlement and your profile.</p><div className="staff-trust-grid"><div><strong>Plans</strong><span>View products</span></div><div><strong>Commission</strong><span>Track earnings</span></div><div><strong>Profile</strong><span>Advisor details</span></div></div></div></section>
 <section className="auth-panel"><div className="auth-form-card"><span className="auth-kicker">ADVISOR SIGN IN</span><h2>Welcome, Advisor</h2><p className="auth-form-intro">Use the email and password created by your admin.</p>{error&&<div className="auth-error">{error}</div>}<div className="auth-form"><label className="auth-field-label">Email address</label><input className="auth-input" type="email" placeholder="Advisor email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/><label className="auth-field-label">Password</label><div className="password-field"><input className="auth-input" type={show?"text":"password"} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/><button type="button" onClick={()=>setShow(v=>!v)}>{show?"Hide":"Show"}</button></div><button className="auth-btn" onClick={()=>void login()} disabled={loading}>{loading?"Signing in...":"Advisor Sign In"}</button></div><p className="auth-links"><Link to="/customer-otp-login" state={{email:email.trim().toLowerCase(),mode:"login"}}>Login with email OTP</Link></p><p className="auth-links">Admin?<Link to="/admin-login">Admin Login</Link></p></div></section></div>;
}