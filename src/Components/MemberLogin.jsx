import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "../App.css";

function friendlyName(email) {
  if (!email) return "Member";
  const [name] = email.split("@");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function MemberLogin({ setDisplayName }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: supaErr } = await supabase
      .from("Members")
      .select("email")
      .eq("email", email)
      .eq("password", password)
      .maybeSingle();

    setLoading(false);

    if (supaErr) {
      setError(supaErr.message);
      return;
    }
    if (!data) {
      setError("Invalid email or password");
      return;
    }

    const name = friendlyName(email);
    setDisplayName(name);
    navigate("/");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Member Login</h1>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        {error && <p className="msg msg-error">{error}</p>}
      </div>
    </div>
  );
}
