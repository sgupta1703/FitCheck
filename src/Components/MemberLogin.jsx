import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import TargetCursor from "../TargetCursor";
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

    try {
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
      setDisplayName?.(name);
      navigate("/");
    } catch (err) {
      setLoading(false);
      setError(err?.message || "Login failed");
    }
  };

  return (
    <>
      <div style={pageStyles.page}>
        <div style={pageStyles.card} role="region" aria-label="Member login">
          <h1 style={pageStyles.heading}>Member Login</h1>

          <form onSubmit={handleLogin} style={pageStyles.form} noValidate>
            <label htmlFor="email" style={pageStyles.srOnly}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              style={pageStyles.input}
            />

            <label htmlFor="password" style={pageStyles.srOnly}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={pageStyles.input}
            />

            <button
              type="submit"
              style={{ ...pageStyles.button, ...(loading ? pageStyles.buttonDisabled : {}) }}
              disabled={loading}
              aria-busy={loading}
              className="cursor-target"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {error ? (
            <div role="alert" style={{ ...pageStyles.msg, ...pageStyles.msgError }}>
              {error}
            </div>
          ) : null}
        </div>
      </div>

    </>
  );
}

/* styles copied/adapted from AdminLogin layout, with fontFamily set to match global */
const FONT_STACK = 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const pageStyles = {
  // fill the area under the fixed header exactly and prevent body scroll
  page: {
    height: "calc(100vh - 72px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "28px 20px",
    boxSizing: "border-box",
    background: "linear-gradient(180deg, rgba(247,250,252,0.6), rgba(255,255,255,0.6))",
    overflow: "hidden", // prevents the document from scrolling; card handles its own overflow
    fontFamily: FONT_STACK, // ensure this component uses the same font stack
  },
  // card will scroll internally if viewport is tiny
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
    maxHeight: "calc(100vh - 160px)", // leave room for header + padding
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

/* keep the same focus enhancement behavior as AdminLogin */
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
      el.style.borderColor = "rgba(0, 0, 0, 1)";
    }
  });
})();
