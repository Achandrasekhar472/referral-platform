import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function Signup({ onSignup, goBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setNotice({ type: "", text: "" });

    if (!name || !email || !password) {
      setNotice({ type: "error", text: "Please fill all fields." });
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

     await setDoc(doc(db, "users", user.uid), {
  uid: user.uid,
  name,
  email,
  accountStatus: "active", // active | suspended | blocked
  suspensionReason: "",
  createdAt: new Date().toISOString(),
});
      setNotice({ type: "success", text: "Account created successfully." });

      onSignup({
        name,
        email,
        uid: user.uid,
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

          <h2>Create Your Account</h2>
          <p className="section-subtitle">
            Join OfferX to post offers, exchange with others, and build trust through completed history.
          </p>

          {notice.text && (
            <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
          )}

          <input
            className="input"
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

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
            <button className="primary-btn" onClick={handleSignup} disabled={loading}>
              {loading ? "Creating..." : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;