import React, { useMemo, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

function MarketplaceExplore({
  listings,
  currentUser,
  isLoggedIn,
  goBack,
  goToLogin,
  onOpenOrder,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedListing, setSelectedListing] = useState(null);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loadingOrder, setLoadingOrder] = useState(false);

  const visibleListings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return listings.filter((item) => {
      if (item.listingStatus !== "approved") return false;
      if (item.isActive === false) return false;
      if (item.sold === true) return false;
      if (item.expiry && item.expiry < today) return false;

      const matchesType = typeFilter === "All" || item.type === typeFilter;
      const text =
        `${item.title} ${item.category} ${item.type} ${item.description} ${item.sellerName}`.toLowerCase();

      const matchesSearch = text.includes(searchTerm.toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [listings, searchTerm, typeFilter]);

  const createDirectOrder = async (listing) => {
    setNotice({ type: "", text: "" });

    if (!isLoggedIn) {
      goToLogin();
      return;
    }

    if (listing.sellerId === currentUser?.uid) {
      setNotice({ type: "error", text: "You cannot buy your own listing." });
      return;
    }

    try {
      setLoadingOrder(true);

      const price = Number(listing.price || 0);
      const platformFee = Math.round(price * 0.1);
      const sellerAmount = price - platformFee;

      const orderRef = await addDoc(collection(db, "marketplaceOrders"), {
        sourceModel: "A",
        listingId: listing.id,
        requestId: "",
        title: listing.title,
        type: listing.type,
        category: listing.category,
        listingCode: listing.code,
        buyerId: currentUser.uid,
        buyerName: currentUser.name,
        buyerEmail: currentUser.email,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        sellerEmail: listing.sellerEmail,
        amount: price,
        platformFee,
        sellerAmount,
        paymentStatus: "pending",
        orderStatus: "awaiting_payment",
        revealed: false,
        reported: false,
        reportStatus: "",
        earningStatus: "pending",
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      setSelectedListing(null);

      if (onOpenOrder) {
        onOpenOrder(orderRef.id);
      }
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingOrder(false);
    }
  };

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        <h2 className="section-title">Marketplace Listings</h2>
        <p className="section-subtitle">
          Buy approved listings. Payment is verified manually by admin before code reveal.
        </p>

        <div className="top-filter-bar fade-in">
          <div className="top-filter-item">
            <label>Search</label>
            <input
              className="input"
              placeholder="Search title, seller, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="top-filter-item">
            <label>Type</label>
            <select
              className="select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option>All</option>
              <option>Referral</option>
              <option>Coupon</option>
              <option>Promo</option>
              <option>Voucher</option>
            </select>
          </div>
        </div>

        {visibleListings.length === 0 ? (
          <div className="empty-state">No marketplace listings available right now.</div>
        ) : (
          <div className="offers-grid">
            {visibleListings.map((item) => (
              <div
                key={item.id}
                className="offer-card clickable fade-in"
                onClick={() => setSelectedListing(item)}
              >
                <div className="offer-meta">
                  <span className="soft-badge">{item.type}</span>
                  <span className="soft-badge">{item.category}</span>
                  <span className="status-badge available">Approved</span>
                </div>

                <h4>{item.title}</h4>
                <p className="offer-summary">
                  {item.description?.length > 100
                    ? `${item.description.slice(0, 100)}...`
                    : item.description}
                </p>
                <p><strong>Seller:</strong> {item.sellerName}</p>
                <p><strong>Price:</strong> ₹{item.price}</p>
                {item.originalValue > 0 && (
                  <p><strong>Original Value:</strong> ₹{item.originalValue}</p>
                )}
                <p><strong>Expiry:</strong> {item.expiry}</p>
                <p className="click-note">Click to view full details</p>
              </div>
            ))}
          </div>
        )}

        {selectedListing && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>{selectedListing.title}</h3>
              <p><strong>Type:</strong> {selectedListing.type}</p>
              <p><strong>Category:</strong> {selectedListing.category}</p>
              <p><strong>Seller:</strong> {selectedListing.sellerName}</p>
              <p><strong>Price:</strong> ₹{selectedListing.price}</p>
              {selectedListing.originalValue > 0 && (
                <p><strong>Original Value:</strong> ₹{selectedListing.originalValue}</p>
              )}
              <p><strong>Expiry:</strong> {selectedListing.expiry}</p>
              <p><strong>Description:</strong> {selectedListing.description}</p>

              <div className="form-header-note" style={{ marginTop: "12px" }}>
                After you pay the platform and admin marks the order as paid, the code will be revealed automatically.
              </div>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={() => createDirectOrder(selectedListing)}
                  disabled={loadingOrder}
                >
                  {loadingOrder ? "Creating Order..." : "Buy Now"}
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => setSelectedListing(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketplaceExplore;