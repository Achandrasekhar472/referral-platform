import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

function Explore({
  offers,
  setOffers,
  setRequests,
  marketplaceListings,
  isLoggedIn,
  currentUser,
  goToLogin,
  goBack,
  goToPost,
  goToSell,
  goToBuyRequests,
  onOpenOrder,
}) {
  const [viewMode, setViewMode] = useState("all");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [showExchangeBox, setShowExchangeBox] = useState(false);
  const [selectedTargetOffer, setSelectedTargetOffer] = useState(null);
  const [myOffers, setMyOffers] = useState([]);
  const [selectedMyOfferId, setSelectedMyOfferId] = useState("");
  const [requests, setLocalRequests] = useState([]);
  const [selectedExchangeOfferDetails, setSelectedExchangeOfferDetails] = useState(null);

  const [selectedBuyListing, setSelectedBuyListing] = useState(null);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingBuyOrder, setLoadingBuyOrder] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "offers"), (snapshot) => {
      const offersData = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setOffers(offersData);
      setLoadingOffers(false);
    });

    return () => unsubscribe();
  }, [setOffers]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "requests"), (snapshot) => {
      const requestsData = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setLocalRequests(requestsData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.email) {
      setMyOffers([]);
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const mine = offers.filter(
      (offer) =>
        offer.ownerEmail === currentUser.email &&
        offer.isActive !== false &&
        offer.expiry >= today &&
        offer.listingStatus === "approved"
    );

    setMyOffers(mine);
  }, [offers, currentUser]);

  const getOwnerRating = (ownerEmail) => {
    const ownerRatedRequests = requests.filter(
      (req) =>
        req.targetOfferOwnerEmail === ownerEmail &&
        typeof req.rating === "number" &&
        req.rating > 0
    );

    if (ownerRatedRequests.length === 0) return "New";

    const avg =
      ownerRatedRequests.reduce((sum, req) => sum + req.rating, 0) /
      ownerRatedRequests.length;

    return avg.toFixed(1);
  };

  const isOfferBusy = (offerId) => {
    return requests.some(
      (req) =>
        (req.status === "pending" || req.status === "accepted") &&
        (req.targetOfferId === offerId || req.requesterOfferId === offerId) &&
        !req.completed
    );
  };

  const exchangeOffers = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return offers.filter((offer) => {
      if (offer.listingStatus !== "approved") return false;
      if (offer.isActive === false) return false;
      if (!offer.expiry || offer.expiry < today) return false;

      const matchesType = typeFilter === "All" || offer.type === typeFilter;
      const matchesCategory =
        categoryFilter === "All" || offer.category === categoryFilter;

      const text =
        `${offer.title} ${offer.category} ${offer.type} ${offer.description} ${offer.ownerName}`.toLowerCase();

      const matchesSearch = text.includes(searchTerm.toLowerCase());

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [offers, typeFilter, categoryFilter, searchTerm]);

  const buyListings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return marketplaceListings.filter((item) => {
      if (item.listingStatus !== "approved") return false;
      if (item.isActive === false) return false;
      if (item.sold === true) return false;
      if (item.expiry && item.expiry < today) return false;

      const matchesType = typeFilter === "All" || item.type === typeFilter;
      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;

      const text =
        `${item.title} ${item.category} ${item.type} ${item.description} ${item.sellerName}`.toLowerCase();

      const matchesSearch = text.includes(searchTerm.toLowerCase());

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [marketplaceListings, typeFilter, categoryFilter, searchTerm]);

  const clearNotice = () => setNotice({ type: "", text: "" });

  const openExchangeBox = (offer) => {
    clearNotice();

    if (!isLoggedIn) {
      setNotice({ type: "error", text: "Please login first to request an exchange." });
      goToLogin();
      return;
    }

    if (offer.ownerEmail === currentUser?.email) {
      setNotice({ type: "error", text: "You cannot request your own offer." });
      return;
    }

    if (offer.isActive === false) {
      setNotice({ type: "error", text: "This offer is no longer available." });
      return;
    }

    if (isOfferBusy(offer.id)) {
      setNotice({
        type: "error",
        text: "This offer is already involved in another active exchange.",
      });
      return;
    }

    if (myOffers.length === 0) {
      setNotice({
        type: "info",
        text: "You need at least one approved active offer before starting an exchange.",
      });
      return;
    }

    setSelectedTargetOffer(offer);
    setSelectedMyOfferId("");
    setShowExchangeBox(true);
  };

  const closeExchangeBox = () => {
    setShowExchangeBox(false);
    setSelectedTargetOffer(null);
    setSelectedMyOfferId("");
  };

  const handleConfirmExchange = async () => {
    if (!selectedTargetOffer) {
      setNotice({ type: "error", text: "No target offer selected." });
      return;
    }

    if (!selectedMyOfferId) {
      setNotice({ type: "error", text: "Please select one of your offers." });
      return;
    }

    const mySelectedOffer = myOffers.find((offer) => offer.id === selectedMyOfferId);

    if (!mySelectedOffer) {
      setNotice({ type: "error", text: "Selected offer not found." });
      return;
    }

    if (isOfferBusy(selectedTargetOffer.id)) {
      setNotice({
        type: "error",
        text: "Requested offer is already involved in another active exchange.",
      });
      return;
    }

    if (isOfferBusy(mySelectedOffer.id)) {
      setNotice({
        type: "error",
        text: "Your selected offer is already involved in another active exchange.",
      });
      return;
    }

    try {
      await addDoc(collection(db, "requests"), {
        targetOfferId: selectedTargetOffer.id,
        targetOfferTitle: selectedTargetOffer.title,
        targetOfferType: selectedTargetOffer.type,
        targetOfferCategory: selectedTargetOffer.category,
        targetOfferOwnerId: selectedTargetOffer.ownerId,
        targetOfferOwnerName: selectedTargetOffer.ownerName,
        targetOfferOwnerEmail: selectedTargetOffer.ownerEmail,
        targetOfferCode: selectedTargetOffer.code,
        targetOfferListingStatus: selectedTargetOffer.listingStatus || "approved",

        requesterOfferId: mySelectedOffer.id,
        requesterOfferTitle: mySelectedOffer.title,
        requesterOfferType: mySelectedOffer.type,
        requesterOfferCategory: mySelectedOffer.category,
        requesterOfferOwnerId: mySelectedOffer.ownerId,
        requesterOfferOwnerName: mySelectedOffer.ownerName,
        requesterOfferOwnerEmail: mySelectedOffer.ownerEmail,
        requesterOfferCode: mySelectedOffer.code,
        requesterOfferListingStatus: mySelectedOffer.listingStatus || "approved",

        requestedById: currentUser.uid,
        requestedByName: currentUser.name,
        requestedByEmail: currentUser.email,

        status: "pending",
        messages: [],
        revealed: false,
        completed: false,
        rating: 0,
        createdAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "Exchange request sent successfully." });
      closeExchangeBox();
      setSelectedExchangeOfferDetails(null);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const createBuyOrder = async (listing) => {
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
      setLoadingBuyOrder(true);

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
        listingCode: "",
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

      setSelectedBuyListing(null);

      if (onOpenOrder) {
        onOpenOrder(orderRef.id);
      }
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingBuyOrder(false);
    }
  };

  const renderExchangeCard = (offer) => {
    const busy = isOfferBusy(offer.id);
    const ownerRating = getOwnerRating(offer.ownerEmail);

    return (
      <div
        key={`exchange-${offer.id}`}
        className="offer-card clickable fade-in"
        onClick={() => setSelectedExchangeOfferDetails(offer)}
      >
        <div className="offer-meta">
          <span className="soft-badge">Exchange</span>
          <span className="soft-badge">{offer.type}</span>
          <span className="soft-badge">{offer.category}</span>
          <span className={`status-badge ${busy ? "busy" : "available"}`}>
            {busy ? "Busy" : "Available"}
          </span>
        </div>

        <h4>{offer.title}</h4>

        <p className="offer-summary">
          {offer.description?.length > 90
            ? `${offer.description.slice(0, 90)}...`
            : offer.description}
        </p>

        <div className="owner-row">
          <span className="owner-pill">By {offer.ownerName}</span>
          <span className="rating-pill">
            ⭐ {ownerRating === "New" ? "New User" : ownerRating}
          </span>
        </div>

        <p className="mini-line">Expires on {offer.expiry}</p>
        <p className="click-note">Click to view exchange details</p>
      </div>
    );
  };

  const renderBuyCard = (item) => {
    return (
      <div
        key={`buy-${item.id}`}
        className="offer-card clickable fade-in"
        onClick={() => setSelectedBuyListing(item)}
      >
        <div className="offer-meta">
          <span className="soft-badge">Buy</span>
          <span className="soft-badge">{item.type}</span>
          <span className="soft-badge">{item.category}</span>
          <span className="status-badge available">Approved</span>
        </div>

        <h4>{item.title}</h4>

        <p className="offer-summary">
          {item.description?.length > 90
            ? `${item.description.slice(0, 90)}...`
            : item.description}
        </p>

        <div className="owner-row">
          <span className="owner-pill">By {item.sellerName}</span>
          <span className="rating-pill">₹ {item.price}</span>
        </div>

        <p className="mini-line">Expires on {item.expiry}</p>
        <p className="click-note">Click to view buy details</p>
      </div>
    );
  };

  const combinedList = useMemo(() => {
    if (viewMode === "exchange") return exchangeOffers.map((item) => ({ kind: "exchange", item }));
    if (viewMode === "buy") return buyListings.map((item) => ({ kind: "buy", item }));

    return [
      ...buyListings.map((item) => ({ kind: "buy", item })),
      ...exchangeOffers.map((item) => ({ kind: "exchange", item })),
    ];
  }, [viewMode, buyListings, exchangeOffers]);

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>
            {notice.text}
          </div>
        )}

        <h2 className="section-title">Explore Offers</h2>
        <p className="section-subtitle">
          Browse offers in one place. Buy approved listings or exchange with other users.
        </p>

        <div className="form-actions" style={{ marginBottom: "18px", flexWrap: "wrap" }}>
          <button className="primary-btn" onClick={goToBuyRequests}>
            Post Requirement
          </button>
          <button className="secondary-btn" onClick={goToSell}>
            Sell
          </button>
          <button className="secondary-btn" onClick={goToPost}>
            Post Offer
          </button>
          <button
            className={viewMode === "all" ? "primary-btn" : "secondary-btn"}
            onClick={() => setViewMode("all")}
          >
            All
          </button>
          <button
            className={viewMode === "buy" ? "primary-btn" : "secondary-btn"}
            onClick={() => setViewMode("buy")}
          >
            Buy Listings
          </button>
          <button
            className={viewMode === "exchange" ? "primary-btn" : "secondary-btn"}
            onClick={() => setViewMode("exchange")}
          >
            Exchange
          </button>
        </div>

        <div className="top-filter-bar fade-in">
          <div className="top-filter-item">
            <label>Search</label>
            <input
              className="input"
              placeholder="Search title, owner, seller, category..."
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

          <div className="top-filter-item">
            <label>Category</label>
            <select
              className="select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option>All</option>
              <option>Food</option>
              <option>Travel</option>
              <option>Shopping</option>
              <option>Education</option>
              <option>Entertainment</option>
              <option>Services</option>
            </select>
          </div>

          <div className="top-filter-action">
            <label>&nbsp;</label>
            <button
              className="secondary-btn"
              style={{ width: "100%" }}
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("All");
                setCategoryFilter("All");
                setViewMode("all");
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="offer-list-area">
          {loadingOffers ? (
            <div className="empty-state">
              <span className="loading-text">Loading offers...</span>
            </div>
          ) : combinedList.length === 0 ? (
            <div className="empty-state">No offers available right now.</div>
          ) : (
            <div className="offers-grid">
              {combinedList.map(({ kind, item }) =>
                kind === "exchange" ? renderExchangeCard(item) : renderBuyCard(item)
              )}
            </div>
          )}
        </div>

        {selectedExchangeOfferDetails && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>{selectedExchangeOfferDetails.title}</h3>
              <p><strong>Mode:</strong> Exchange</p>
              <p><strong>Type:</strong> {selectedExchangeOfferDetails.type}</p>
              <p><strong>Category:</strong> {selectedExchangeOfferDetails.category}</p>
              <p><strong>Owner:</strong> {selectedExchangeOfferDetails.ownerName}</p>
              <p><strong>Description:</strong> {selectedExchangeOfferDetails.description}</p>
              <p><strong>Expiry:</strong> {selectedExchangeOfferDetails.expiry}</p>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={() => openExchangeBox(selectedExchangeOfferDetails)}
                >
                  Request Exchange
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => setSelectedExchangeOfferDetails(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showExchangeBox && selectedTargetOffer && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Request Exchange</h3>
              <p><strong>Target Offer:</strong> {selectedTargetOffer.title}</p>

              <select
                className="select"
                value={selectedMyOfferId}
                onChange={(e) => setSelectedMyOfferId(e.target.value)}
                style={{ marginTop: "12px" }}
              >
                <option value="">Select one of your approved offers</option>
                {myOffers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.title}
                  </option>
                ))}
              </select>

              <div className="form-actions" style={{ marginTop: "12px" }}>
                <button className="primary-btn" onClick={handleConfirmExchange}>
                  Confirm Exchange
                </button>
                <button className="secondary-btn" onClick={closeExchangeBox}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedBuyListing && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>{selectedBuyListing.title}</h3>
              <p><strong>Mode:</strong> Buy</p>
              <p><strong>Type:</strong> {selectedBuyListing.type}</p>
              <p><strong>Category:</strong> {selectedBuyListing.category}</p>
              <p><strong>Seller:</strong> {selectedBuyListing.sellerName}</p>
              <p><strong>Price:</strong> ₹{selectedBuyListing.price}</p>
              {selectedBuyListing.originalValue > 0 && (
                <p><strong>Original Value:</strong> ₹{selectedBuyListing.originalValue}</p>
              )}
              <p><strong>Description:</strong> {selectedBuyListing.description}</p>
              <p><strong>Expiry:</strong> {selectedBuyListing.expiry}</p>

              <div className="form-header-note" style={{ marginTop: "12px" }}>
                After you pay the platform and admin marks the order as paid, the code will be revealed automatically.
              </div>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={() => createBuyOrder(selectedBuyListing)}
                  disabled={loadingBuyOrder}
                >
                  {loadingBuyOrder ? "Creating Order..." : "Buy Now"}
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => setSelectedBuyListing(null)}
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

export default Explore;