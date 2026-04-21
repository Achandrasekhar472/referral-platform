import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

function Login({ onLogin, goBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setNotice({ type: "", text: "" });

    if (!email || !password) {
      setNotice({ type: "error", text: "Please fill all fields." });
      return;
    }

    try {
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      setNotice({ type: "success", text: "Login successful." });

      onLogin({
        email: user.email,
        uid: user.uid,
        name: user.email.split("@")[0],
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page">
      <div className="container">
        <div className="form-card">
          <button className="secondary-btn back-btn" onClick={goBack}>
            ⬅ Back
          </button>

          <h2>Welcome Back</h2>
          <p className="section-subtitle">
            Sign in to continue exchanging referrals, coupons, and promo offers.
          </p>

          {notice.text && (
            <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
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
            <button className="primary-btn" onClick={handleLogin} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;