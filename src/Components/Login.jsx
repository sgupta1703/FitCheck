import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "../App.css";

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Login({ setDisplayName }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);

      if (authError) {
        setError(authError.message || "Login failed");
        return;
      }

      const local = email.split("@")[0] || "User";
      const parts = local.split(".");
      const friendly =
        parts.length >= 2
          ? `${capitalize(parts[0])} ${capitalize(parts[1])}`
          : capitalize(parts[0]);

      setDisplayName(friendly);        
      setMessage(`Welcome ${friendly}`);
      console.log("Logged in user:", data?.user ?? data);

      await new Promise((res) => setTimeout(res, 2000));
      navigate("/");                  
    } catch (err) {
      setLoading(false);
      setError(err.message || "An unexpected error occurred");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="region" aria-label="Admin login form">
        <h1 className="login-title">Admin Login</h1>

        <form onSubmit={handleLogin} className="login-form">
          <label className="sr-only" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
            autoComplete="username"
          />

          <label className="sr-only" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
            autoComplete="current-password"
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && <p className="msg msg-error" role="alert">{error}</p>}
        {message && <p className="msg msg-success" role="status">{message}</p>}
      </div>
    </div>
  );
}
