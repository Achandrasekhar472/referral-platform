import React, { useState } from "react";
import { addDoc, collection, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

function SellListing({ user, goBack }) {
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expiry, setExpiry] = useState("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setNotice({ type: "", text: "" });

    if (!type || !title || !category || !description || !expiry || !code || !price) {
      setNotice({ type: "error", text: "Please fill all required fields." });
      return;
    }

    try {
      setLoading(true);

      const listingRef = await addDoc(collection(db, "marketplaceListings"), {
        sellerId: user.uid,
        sellerName: user.name,
        sellerEmail: user.email,
        title,
        type,
        category,
        description,
        expiry,
        price: Number(price),
        originalValue: originalValue ? Number(originalValue) : 0,
        listingStatus: "pending",
        isActive: true,
        sold: false,
        sourceModel: "A",
        createdAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "listingSecrets", listingRef.id), {
        code: code,
        sellerId: user.uid,
        createdAt: new Date().toISOString(),
      });

      setNotice({
        type: "success",
        text: "Marketplace listing submitted. It is now under admin review.",
      });

      setType("");
      setTitle("");
      setCategory("");
      setDescription("");
      setExpiry("");
      setCode("");
      setPrice("");
      setOriginalValue("");
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

          <h2>Sell a Listing</h2>
          <p className="section-subtitle">
            Add a ready-to-sell code for Marketplace. This will not affect the exchange section.
          </p>

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
            <option value="Coupon">Coupon</option>
            <option value="Promo">Promo</option>
            <option value="Voucher">Voucher</option>
            <option value="Referral">Referral</option>
          </select>

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
            placeholder="Listing title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <textarea
            className="textarea"
            placeholder="Describe the offer, where it works, and any conditions"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <input
            className="input"
            type="number"
            placeholder="Selling price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <input
            className="input"
            type="number"
            placeholder="Original value (optional)"
            value={originalValue}
            onChange={(e) => setOriginalValue(e.target.value)}
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
            placeholder="Stored code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          <div className="form-header-note">
            Code will be revealed only after a buyer pays and admin marks the order as paid.
          </div>

          <div className="form-actions">
            <button className="primary-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Listing"}
            </button>
            <button className="secondary-btn" onClick={goBack}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SellListing;