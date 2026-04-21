import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

function PostOffer({ goToExplore, goBack, user }) {
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expiry, setExpiry] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setNotice({ type: "", text: "" });

    if (!type || !title || !category || !description || !expiry || !code) {
      setNotice({ type: "error", text: "Please fill all fields." });
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "offers"), {
        title,
        type,
        category,
        description,
        expiry,
        code,
        ownerName: user.name,
        ownerEmail: user.email,
        ownerId: user.uid,
        isActive: true,
        exchangeStatus: "available",
        listingStatus: "pending",
        createdAt: new Date().toISOString(),
      });

      setNotice({
        type: "success",
        text: "Offer submitted successfully. It is now under review and will appear in Explore after approval.",
      });

      setType("");
      setTitle("");
      setCategory("");
      setDescription("");
      setExpiry("");
      setCode("");
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

          <h2>Post a New Offer</h2>
          <p className="section-subtitle">
            Create a clean, exchange-ready listing that other users can trust and request.
          </p>

          <div className="form-header-note">
            Your offer will first go under team review. It will appear in Explore only after approval.
          </div>

          {notice.text && (
            <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
          )}

          <select
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ marginBottom: "12px" }}
          >
            <option value="">Select Type</option>
            <option value="Referral">Referral</option>
            <option value="Coupon">Coupon</option>
            <option value="Promo">Promo</option>
            <option value="Voucher">Voucher</option>
          </select>
          <p className="helper-text">Choose the kind of offer you want to exchange.</p>

          <select
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ marginBottom: "12px" }}
          >
            <option value="">Select Category</option>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Shopping">Shopping</option>
            <option value="Education">Education</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Services">Services</option>
          </select>

          <input
            className="input"
            placeholder="Offer title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <textarea
            className="textarea"
            placeholder="Describe the offer, value, conditions, or usage notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <input
            className="input"
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <input
            className="input"
            placeholder="Offer code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <div className="form-actions">
            <button className="primary-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Offer"}
            </button>
            <button className="secondary-btn" onClick={goToExplore}>
              Go to Explore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostOffer;