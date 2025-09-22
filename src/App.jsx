import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import AdminLogin from "./Components/AdminLogin";
import MemberLogin from "./Components/MemberLogin";
import CreateAccount from "./Components/CreateAccount";
import "./App.css";

function Home({ displayName }) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="hero-inner">
        <h1 id="home-title">
          Welcome to FitCheck{displayName ? `, ${displayName}` : ""}!
        </h1>
      </div>
    </section>
  );
}

export default function App() {
  const [displayName, setDisplayName] = useState("");

  return (
    <Router>
      <nav className="navbar" role="navigation">
        <div className="navbar-left">
          <h2 className="brand">FitCheck</h2>
        </div>

        <div className="navbar-right">
          <Link to="/" className="nav-link nav-link-ghost">Home</Link>
          <Link to="/login" className="nav-link nav-link-ghost">Admin</Link>
          <Link to="/member-login" className="nav-link nav-link-ghost">Members</Link>
          <Link to="/create-account" className="nav-link nav-link-ghost">Create Account</Link>
        </div>
      </nav>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home displayName={displayName} />} />
          <Route path="/login" element={<AdminLogin setDisplayName={setDisplayName} />} />
          <Route path="/member-login" element={<MemberLogin setDisplayName={setDisplayName} />} />
          <Route path="/create-account" element={<CreateAccount />} />
        </Routes>
      </main>
    </Router>
  );
}
