import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import TargetCursor from "../TargetCursor";
import "../App.css";

export default function CreateAccount() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const { data: existing, error: selErr } = await supabase
        .from("Members")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (selErr) {
        setError(selErr.message || "Failed to check existing accounts");
        setLoading(false);
        return;
      }
      if (existing) {
        setError("Account already exists");
        setLoading(false);
        return;
      }

      const { error: insErr } = await supabase.from("Members").insert([{ email, password }]);

      setLoading(false);
      if (insErr) {
        setError(insErr.message || "Failed to create account");
        return;
      }

      setSuccess("Account created! Redirecting...");
      setTimeout(() => navigate("/member-login"), 1200);
    } catch (err) {
      setLoading(false);
      setError(err?.message || "An unexpected error occurred");
    }
  };

  const handleFocus = (e) => {
    e.target.style.boxShadow = "0 0 0 6px rgba(99,102,241,0.08)";
    e.target.style.borderColor = "#6366f1";
    e.target.style.outline = "none";
  };
  const handleBlur = (e) => {
    e.target.style.boxShadow = "";
    e.target.style.borderColor = "rgba(16,24,40,0.12)";
  };

  return (
    <>
      <div style={styles.page}>
        <div style={styles.card} role="region" aria-label="Create member account">
          <h1 style={styles.heading}>Create Member Account</h1>

          <form onSubmit={handleCreate} style={styles.form} noValidate>
            <label htmlFor="email" style={styles.srOnly}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoComplete="username"
            />

            <label htmlFor="password" style={styles.srOnly}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoComplete="new-password"
            />

            <button
              type="submit"
              style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
              disabled={loading}
              aria-busy={loading}
              className="cursor-target"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </form>

          {error ? (
            <div role="alert" style={{ ...styles.msg, ...styles.msgError }}>
              {error}
            </div>
          ) : null}
          {success ? (
            <div role="status" style={{ ...styles.msg, ...styles.msgSuccess }}>
              {success}
            </div>
          ) : null}
        </div>
      </div>

    </>
  );
}

const FONT_STACK = 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const styles = {
  page: {
    height: "calc(100vh - 72px)", 
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "28px 20px",
    boxSizing: "border-box",
    background: "linear-gradient(180deg, rgba(247,250,252,0.6), rgba(255,255,255,0.6))",
    overflow: "hidden", 
    fontFamily: FONT_STACK,
  },
  card: {
    width: "100%",
    maxWidth: 540,
    padding: 28,
    borderRadius: 14,
    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(250,250,250,0.98))",
    boxShadow: "0 20px 50px rgba(2,6,23,0.08)",
    border: "1px solid rgba(16,24,40,0.04)",
    backdropFilter: "blur(6px)",
    boxSizing: "border-box",
    maxHeight: "calc(100vh - 160px)", 
    overflowY: "auto",
    fontFamily: FONT_STACK,
  },
  heading: {
    margin: 0,
    marginBottom: 14,
    fontSize: 22,
    fontWeight: 800,
    color: "#0b1220",
    textAlign: "left",
    fontFamily: FONT_STACK,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 6,
  },
  input: {
    height: 50,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(16,24,40,0.12)",
    background: "white",
    fontSize: 15,
    color: "#0b1220",
    outline: "none",
    boxSizing: "border-box",
    transition: "box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease",
    fontFamily: FONT_STACK,
  },
  button: {
    marginTop: 6,
    height: 50,
    borderRadius: 12,
    border: "none",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    background: "linear-gradient(90deg,#6366f1,#ec4899)",
    color: "white",
    boxShadow: "0 8px 22px rgba(99,102,241,0.18)",
    transition: "transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease",
    fontFamily: FONT_STACK,
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: "default",
    transform: "none",
    boxShadow: "none",
  },
  msg: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: FONT_STACK,
  },
  msgError: {
    background: "rgba(254,242,242,0.95)",
    color: "#9f1239",
    border: "1px solid rgba(159,18,57,0.06)",
  },
  msgSuccess: {
    background: "rgba(240,249,255,0.95)",
    color: "#0369a1",
    border: "1px solid rgba(3,105,161,0.06)",
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
};

(function enhanceFocus() {
  if (typeof window === "undefined") return;
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      el.style.boxShadow = "0 0 0 6px rgba(99,102,241,0.08)";
      el.style.borderColor = "#6366f1";
      el.style.outline = "none";
    }
  });

  document.addEventListener("focusout", (e) => {
    const el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      el.style.boxShadow = "";
      el.style.borderColor = "rgba(16,24,40,0.12)";
    }
  });
})();
