import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import Login from "./Components/Login";
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

function App() {
  const [displayName, setDisplayName] = useState("");

  return (
    <Router>
      <div>
        <nav className="navbar" role="navigation" aria-label="Main navigation">
          <div className="navbar-left">
            <h2 className="brand">FitCheck</h2>
          </div>

          <div className="navbar-right">
            <Link to="/" className="nav-link nav-link-ghost">
              Home
            </Link>
            <Link to="/login" className="nav-link nav-link-ghost">
              Login
            </Link>
          </div>
        </nav>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Home displayName={displayName} />} />
            <Route
              path="/login"
              element={<Login setDisplayName={setDisplayName} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
