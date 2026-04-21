import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function AuthPage({ onLogin, onSignup, goBack }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setNotice({ type: "", text: "" });

    if (mode === "signup" && !name.trim()) {
      setNotice({ type: "error", text: "Please enter your name." });
      return;
    }

    if (!email.trim() || !password.trim()) {
      setNotice({ type: "error", text: "Please fill all required fields." });
      return;
    }

    try {
      setLoading(true);

      if (mode === "login") {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        setNotice({ type: "success", text: "Login successful." });

        onLogin({
          email: user.email,
          uid: user.uid,
          name: user.email.split("@")[0],
        });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name,
          email,
          createdAt: new Date().toISOString(),
        });

        setNotice({ type: "success", text: "Account created successfully." });

        onSignup({
          name,
          email,
          uid: user.uid,
        });
      }
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page">
      <div className="container">
        <div className="form-card auth-card">
          <button className="secondary-btn back-btn" onClick={goBack}>
            ⬅ Back
          </button>

          <div className="auth-toggle">
            <button
              className={mode === "login" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setMode("login");
                setNotice({ type: "", text: "" });
              }}
            >
              Login
            </button>
            <button
              className={mode === "signup" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setMode("signup");
                setNotice({ type: "", text: "" });
              }}
            >
              Sign Up
            </button>
          </div>

          <h2>{mode === "login" ? "Welcome Back" : "Create Your Account"}</h2>
          <p className="section-subtitle">
            {mode === "login"
              ? "Login to continue exploring and exchanging offers."
              : "Create an account to post offers and exchange with others."}
          </p>

          {notice.text && (
            <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
          )}

          {mode === "signup" && (
            <input
              className="input"
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginBottom: "12px" }}
            />
          )}

          <input
            className="input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <div className="form-actions">
            <button className="primary-btn" onClick={handleSubmit} disabled={loading}>
              {loading
                ? mode === "login"
                  ? "Logging in..."
                  : "Creating..."
                : mode === "login"
                ? "Login"
                : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;