import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "../App.css";

export default function CreateAccount() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // check duplicates
    const { data: existing, error: selErr } = await supabase
      .from("Members")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (selErr) {
      setError(selErr.message);
      setLoading(false);
      return;
    }
    if (existing) {
      setError("Account already exists");
      setLoading(false);
      return;
    }

    const { error: insErr } = await supabase
      .from("Members")
      .insert([{ email, password }]);

    setLoading(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setSuccess("Account created! Redirecting...");
    setTimeout(() => navigate("/member-login"), 1200);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Create Member Account</h1>
        <form onSubmit={handleCreate} className="login-form">
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
            {loading ? "Creating..." : "Create"}
          </button>
        </form>
        {error && <p className="msg msg-error">{error}</p>}
        {success && <p className="msg msg-success">{success}</p>}
      </div>
    </div>
  );
}
