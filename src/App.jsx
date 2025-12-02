import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminLogin from "./Components/AdminLogin";
import MemberLogin from "./Components/MemberLogin";
import CreateAccount from "./Components/CreateAccount";
import UploadClothes from "./Components/uploadClothes";
import EditDatabase from "./Components/editDatabase";
import TargetCursor from "./TargetCursor";
import { supabase } from "./Components/supabaseClient"; 

function Home({ displayName }) {
  return (
    <>
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.badge}>FitCheck · Wardrobe Reimagined</div>
          <h1 style={styles.heroTitle}>
            Find outfits that make you feel <span style={styles.accent}>confident</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Mix & match with intelligent suggestions, save favorite looks, and
            discover your unique style—fast.
          </p>

          <div style={styles.ctaRow}>
            <Link to="/upload" className="cursor-target" style={{ ...styles.button, ...styles.primaryButton }}>
              Upload Clothes
            </Link>
            <Link to="/create-account" className="cursor-target" style={{ ...styles.button, ...styles.ghostButton }}>
              Create Account
            </Link>
          </div>
          <br />
          {displayName ? (
            <div style={styles.welcome}>Welcome back, <strong>{displayName}</strong></div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default function App() {
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const prev = document.body.style.margin;
    document.body.style.margin = "0";
    return () => {
      document.body.style.margin = prev;
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("displayName");
    const savedAdmin = localStorage.getItem("isAdmin");
    if (saved) setDisplayName(saved);
    if (savedAdmin === "true") setIsAdmin(true);
  }, []);

  useEffect(() => {
    if (displayName) localStorage.setItem("displayName", displayName);
    else localStorage.removeItem("displayName");
    
    if (isAdmin) localStorage.setItem("isAdmin", "true");
    else localStorage.removeItem("isAdmin");
  }, [displayName, isAdmin]);

  useEffect(() => {
    function onResize() {
      setIsSmall(window.innerWidth <= 820);
      if (window.innerWidth > 820) setMobileOpen(false);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const NavLink = ({ to, children }) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      style={{
        ...styles.navLink,
        ...(isSmall ? styles.navLinkMobile : {}),
      }}
    >
      {children}
    </Link>
  );

  const handleLogout = async () => {
    try {
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn("Sign out error:", err);
    } finally {
      setDisplayName("");
      setIsAdmin(false);
      localStorage.removeItem("displayName");
      localStorage.removeItem("isAdmin");
      setMobileOpen(false);
      window.location.href = "/";
    }
  };

  return (
    <div style={{ position: "relative", background: "transparent", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Router>

        <header style={styles.navbar}>
          <div className="cursor-target" style={styles.navLeft}>
            <Link to="/" style={styles.brand}>
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden style={{ marginRight: 10 }}>
                <rect rx="6" width="24" height="24" fill="none" stroke="#111827" strokeWidth="1.2" />
                <path d="M6 12h12" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span style={{ fontWeight: 800 }}>FitCheck</span>
            </Link>
          </div>

          <nav style={styles.navCenter} aria-label="Main navigation">
            <div style={{ display: isSmall ? "none" : "flex", gap: 10, alignItems: "center" }}>
              <div className="cursor-target"><NavLink to="/">Home</NavLink></div>
              <div className="cursor-target"><NavLink to="/login">Admin</NavLink></div>
              <div className="cursor-target"><NavLink to="/upload">Upload</NavLink></div>
              {isAdmin && (
                <div className="cursor-target"><NavLink to="/edit">Edit</NavLink></div>
              )}
            </div>

            <button
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((s) => !s)}
              style={{ ...styles.iconButton, display: isSmall ? "inline-flex" : "none" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d={mobileOpen ? "M6 6L18 18M6 18L18 6" : "M3 7h18M3 12h18M3 17h18"} stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </nav>

          <div style={styles.navRight}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {displayName ? (
                <>
                  <div style={{ fontWeight: 700, color: "#0b1220", padding: "8px 12px", borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Hello,
                    <strong style={{ fontWeight: 700, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", color: "inherit" }}>{displayName}</strong>
                    {isAdmin && <span style={{ fontSize: 11, background: "#6366f1", color: "white", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>ADMIN</span>}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="cursor-target"
                    style={{ ...styles.button, ...styles.ghostButton, padding: "10px 14px", borderRadius: 10 }}
                    aria-label="Log out"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="cursor-target"><Link to="/member-login" style={{ ...styles.button, ...styles.ghostButton }}>Sign in</Link></div>
                  <div className="cursor-target"><Link to="/create-account" style={{ ...styles.button, ...styles.primaryButton }}>Get Started</Link></div>
                </>
              )}
            </div>
          </div>
        </header>

        {mobileOpen && isSmall ? (
          <div style={styles.mobilePanel}>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/login">Admin</NavLink>
            <NavLink to="/member-login">Members</NavLink>
            <NavLink to="/create-account">Create</NavLink>
            <NavLink to="/upload">Upload</NavLink>
            {isAdmin && <NavLink to="/edit">Edit</NavLink>}
            
            {displayName ? (
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                style={{ ...styles.navLinkMobile, textAlign: "left", border: "none", background: "transparent", padding: "12px 16px", cursor: "pointer" }}
                className="cursor-target"
              >
                Logout
              </button>
            ) : null}
          </div>
        ) : null}

        <main
          style={{
            position: "relative",
            marginTop: 72,
            paddingBottom: 0,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Routes>
            <Route path="/" element={<Home displayName={displayName} />} />
            <Route
              path="/login"
              element={<AdminLogin setDisplayName={setDisplayName} setIsAdmin={setIsAdmin} />}
            />
            <Route
              path="/member-login"
              element={<MemberLogin setDisplayName={setDisplayName} />}
            />
            <Route path="/create-account" element={<CreateAccount />} />
            <Route
              path="/upload"
              element={<UploadClothes displayName={displayName} />}
            />
            <Route
              path="/edit"
              element={isAdmin ? <EditDatabase /> : <Home displayName={displayName} />}
            />
          </Routes>
        </main>

      </Router>
    </div>
  );
}

const styles = {
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    gap: 12,
    zIndex: 1200,
    background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.65))",
    backdropFilter: "blur(8px) saturate(120%)",
    borderBottom: "none",
  },
  navLeft: { display: "flex", alignItems: "center", gap: 12 },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "#0f172a",
    fontSize: 18,
  },
  navCenter: { display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "center" },
  navRight: { display: "flex", alignItems: "center", gap: 12 },

  navLink: {
    textDecoration: "none",
    color: "#111827",
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    transition: "all 160ms ease",
    border: "1px solid transparent",
  },
  navLinkMobile: {
    display: "block",
    width: "100%",
    padding: "14px 16px",
    borderRadius: 8,
    background: "transparent",
    color: "#0b1220",
    border: "1px solid rgba(16,24,40,0.04)",
  },

  iconButton: {
    border: "none",
    background: "transparent",
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },

  mobilePanel: {
    position: "fixed",
    top: 72,
    left: 12,
    right: 12,
    zIndex: 1100,
    background: "rgba(255,255,255,0.98)",
    boxShadow: "0 8px 30px rgba(2,6,23,0.08)",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  hero: {
    height: "calc(100vh - 72px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage:
      "linear-gradient(120deg, rgba(99,102,241,0.10), rgba(236,72,153,0.06)), url('https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1600&q=60')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "#0b1220",
    padding: 0,
    boxSizing: "border-box",
    overflow: "hidden",
  },
  heroInner: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.95))",
    padding: "28px", 
    width: "100%",
    maxWidth: 980,
    borderRadius: 16,
    boxShadow: "0 12px 40px rgba(2,6,23,0.08)",
    textAlign: "center",
    border: "1px solid rgba(16,24,40,0.04)",
    boxSizing: "border-box",
    maxHeight: "none",
    overflow: "visible",
  },
  badge: {
    display: "inline-block",
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(99,102,241,0.08)",
    color: "#4f46e5",
    fontWeight: 700,
    marginBottom: 12,
  },
  heroTitle: {
    margin: "6px 0 12px 0",
    fontSize: "clamp(28px, 5.2vw, 48px)",
    lineHeight: 1.02,
    fontWeight: 800,
    color: "#0b1220",
    letterSpacing: "-0.02em",
  },
  accent: {
    background: "linear-gradient(90deg,#ec4899,#6366f1)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  heroSubtitle: {
    margin: 0,
    marginBottom: 22,
    color: "#334155",
    fontSize: 16,
  },
  ctaRow: { display: "flex", gap: 12, justifyContent: "center", marginTop: 6 },
  button: {
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "transform 160ms ease, box-shadow 160ms ease",
  },
  primaryButton: {
    background: "linear-gradient(90deg,#6366f1,#ec4899)",
    color: "white",
    boxShadow: "0 8px 22px rgba(99,102,241,0.18)",
  },
  ghostButton: {
    background: "transparent",
    border: "1px solid rgba(16,24,40,0.06)",
    color: "#0b1720",
  },
};