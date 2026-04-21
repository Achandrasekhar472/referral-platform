import React, { useEffect, useState } from "react";
import {
  deleteDoc,
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db, auth } from "../firebase";

function Profile({
  offers,
  requests,
  goBack,
  user,
  onAccountDeleted,
  goToSell,
  goToBuyRequests,
  goToOrders,
  goToWithdraw,
  goToPost,
  goToRequests,
  goToExplore,
  goToMySellListings,
}) {
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    description: "",
    expiry: "",
    code: "",
  });
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "marketplaceOrders"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setMarketplaceOrders(allOrders);
    });

    return () => unsubscribe();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const myOffers = offers.filter((offer) => offer.ownerEmail === user.email);

  const relatedRequests = requests.filter(
    (req) =>
      req.targetOfferOwnerEmail === user.email ||
      req.requestedByEmail === user.email
  );

  const completedRequests = relatedRequests.filter((req) => req.completed);

  const ratedRequests = relatedRequests.filter(
    (req) => typeof req.rating === "number" && req.rating > 0
  );

  const averageRating =
    ratedRequests.length > 0
      ? (
          ratedRequests.reduce((sum, req) => sum + req.rating, 0) /
          ratedRequests.length
        ).toFixed(1)
      : "No ratings yet";

  const numericRating =
    ratedRequests.length > 0
      ? ratedRequests.reduce((sum, req) => sum + req.rating, 0) /
        ratedRequests.length
      : 0;

  const trustScore = Math.round(
    numericRating * 20 + completedRequests.length * 5
  );

  const isOfferInActiveExchange = (offerId) => {
    return requests.some(
      (req) =>
        (req.status === "pending" || req.status === "accepted") &&
        !req.completed &&
        (req.targetOfferId === offerId || req.requesterOfferId === offerId)
    );
  };

  const getOfferStatus = (offer) => {
    if (offer.listingStatus === "pending") return "Pending Review";
    if (offer.listingStatus === "rejected") return "Rejected";
    if (offer.isActive === false) return "Exchanged";
    if (offer.expiry < today) return "Expired";
    if (isOfferInActiveExchange(offer.id)) return "Busy";
    if (offer.listingStatus === "approved") return "Approved";
    return "Available";
  };

  const getBadgeClass = (status) => {
    if (status === "Pending Review") return "busy";
    if (status === "Rejected") return "expired";
    if (status === "Exchanged") return "exchanged";
    if (status === "Expired") return "expired";
    if (status === "Busy") return "busy";
    return "available";
  };

  const handleDeleteOffer = async (offer) => {
    setNotice({ type: "", text: "" });

    const status = getOfferStatus(offer);

    if (status === "Busy") {
      setNotice({
        type: "error",
        text: "This offer is part of an active exchange and cannot be deleted.",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${offer.title}"?`
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "offers", offer.id));
      setNotice({ type: "success", text: "Offer deleted successfully." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const startEditOffer = (offer) => {
    setNotice({ type: "", text: "" });

    const status = getOfferStatus(offer);

    if (status !== "Pending Review") {
      setNotice({
        type: "error",
        text: "Only offers under pending review can be edited.",
      });
      return;
    }

    if (isOfferInActiveExchange(offer.id)) {
      setNotice({
        type: "error",
        text: "This offer is part of an active exchange and cannot be edited.",
      });
      return;
    }

    setEditingOfferId(offer.id);
    setEditForm({
      title: offer.title || "",
      category: offer.category || "",
      description: offer.description || "",
      expiry: offer.expiry || "",
      code: offer.code || "",
    });
  };

  const cancelEdit = () => {
    setEditingOfferId(null);
    setEditForm({
      title: "",
      category: "",
      description: "",
      expiry: "",
      code: "",
    });
  };

  const saveEditOffer = async (offerId) => {
    setNotice({ type: "", text: "" });

    if (
      !editForm.title ||
      !editForm.category ||
      !editForm.description ||
      !editForm.expiry ||
      !editForm.code
    ) {
      setNotice({
        type: "error",
        text: "Please fill all fields before saving.",
      });
      return;
    }

    const offerToEdit = myOffers.find((offer) => offer.id === offerId);
    if (offerToEdit && getOfferStatus(offerToEdit) !== "Pending Review") {
      setNotice({
        type: "error",
        text: "Only offers under pending review can be edited.",
      });
      cancelEdit();
      return;
    }

    if (isOfferInActiveExchange(offerId)) {
      setNotice({
        type: "error",
        text: "This offer is part of an active exchange and cannot be edited.",
      });
      cancelEdit();
      return;
    }

    try {
      await updateDoc(doc(db, "offers", offerId), {
        title: editForm.title,
        category: editForm.category,
        description: editForm.description,
        expiry: editForm.expiry,
        code: editForm.code,
        updatedAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "Offer updated successfully." });
      cancelEdit();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const handleDeleteAccount = async () => {
    setNotice({ type: "", text: "" });

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This will delete your profile, offers, requests, and sign-in access."
    );

    if (!confirmed) return;

    try {
      setDeletingAccount(true);

      await deleteDoc(doc(db, "users", user.uid));

      const offersQuery = query(
        collection(db, "offers"),
        where("ownerId", "==", user.uid)
      );
      const offersSnapshot = await getDocs(offersQuery);
      for (const offerDoc of offersSnapshot.docs) {
        await deleteDoc(doc(db, "offers", offerDoc.id));
      }

      const sentRequestsQuery = query(
        collection(db, "requests"),
        where("requestedById", "==", user.uid)
      );
      const sentRequestsSnapshot = await getDocs(sentRequestsQuery);
      for (const reqDoc of sentRequestsSnapshot.docs) {
        await deleteDoc(doc(db, "requests", reqDoc.id));
      }

      const receivedRequestsQuery = query(
        collection(db, "requests"),
        where("targetOfferOwnerId", "==", user.uid)
      );
      const receivedRequestsSnapshot = await getDocs(receivedRequestsQuery);
      for (const reqDoc of receivedRequestsSnapshot.docs) {
        await deleteDoc(doc(db, "requests", reqDoc.id));
      }

      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      if (onAccountDeleted) {
        onAccountDeleted();
      }
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.code === "auth/requires-recent-login"
            ? "For security, please log in again before deleting your account."
            : error.message,
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const approvedOffers = myOffers.filter(
    (offer) => offer.listingStatus === "approved"
  ).length;
  const pendingOffers = myOffers.filter(
    (offer) => offer.listingStatus === "pending"
  ).length;
  const rejectedOffers = myOffers.filter(
    (offer) => offer.listingStatus === "rejected"
  ).length;
  const expiredOffers = myOffers.filter(
    (offer) =>
      offer.listingStatus === "approved" &&
      offer.isActive !== false &&
      offer.expiry < today
  ).length;
  const exchangedOffers = myOffers.filter(
    (offer) => offer.isActive === false
  ).length;

  const myMarketplaceSales = marketplaceOrders.filter(
    (order) => order.sellerId === user.uid
  );

  const myMarketplacePurchases = marketplaceOrders.filter(
    (order) => order.buyerId === user.uid
  );

  const myMarketplacePending = myMarketplaceSales
    .filter((order) => order.earningStatus === "pending")
    .reduce((sum, order) => sum + Number(order.sellerAmount || 0), 0);

  const myMarketplaceAvailable = myMarketplaceSales
    .filter((order) => order.earningStatus === "available")
    .reduce((sum, order) => sum + Number(order.sellerAmount || 0), 0);

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        <h2 className="section-title">My Profile</h2>
        <p className="section-subtitle">
          Track your exchange activity, buy/sell activity, and account details in one place.
        </p>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        <div className="profile-grid">
          <div className="profile-card">
            <h3>{user.name}</h3>
            <p>Email: {user.email}</p>
            <p>⭐ {averageRating}</p>
            <p>Trust Score: {trustScore}</p>

            {trustScore > 80 && <p>✔ Trusted Trader</p>}
            {completedRequests.length > 5 && <p>🔥 Top Exchanger</p>}
          </div>

          <div className="stats-card">
            <h3>Exchange Stats</h3>
            <p>My Total Offers: {myOffers.length}</p>
            <p>Approved Offers: {approvedOffers}</p>
            <p>Pending Review: {pendingOffers}</p>
            <p>Rejected Offers: {rejectedOffers}</p>
            <p>Expired Offers: {expiredOffers}</p>
            <p>Exchanged Offers: {exchangedOffers}</p>
            <p>Completed Exchanges: {completedRequests.length}</p>
          </div>
        </div>

        <div className="panel" style={{ marginTop: "22px" }}>
          <h3>Quick Actions</h3>
          <div className="form-actions" style={{ flexWrap: "wrap" }}>
            <button className="primary-btn" onClick={goToExplore}>
              Browse Offers
            </button>
            <button className="secondary-btn" onClick={goToSell}>
              Sell
            </button>
            <button className="secondary-btn" onClick={goToMySellListings}>
              My Sell Listings
            </button>
            <button className="secondary-btn" onClick={goToBuyRequests}>
              Post Requirement
            </button>
            <button className="secondary-btn" onClick={goToPost}>
              Post Offer
            </button>
            <button className="secondary-btn" onClick={goToRequests}>
              Requests
            </button>
            <button className="secondary-btn" onClick={goToOrders}>
              My Orders
            </button>
            <button className="secondary-btn" onClick={goToWithdraw}>
              Withdraw
            </button>
          </div>
        </div>

        <div className="panel" style={{ marginTop: "22px" }}>
          <h3>Buy / Sell Summary</h3>
          <p>Purchases: {myMarketplacePurchases.length}</p>
          <p>Sales: {myMarketplaceSales.length}</p>
          <p>Pending Earnings: ₹{myMarketplacePending}</p>
          <p>Available Earnings: ₹{myMarketplaceAvailable}</p>
        </div>

        <div className="panel" style={{ marginTop: "22px" }}>
          <h3>My Exchange Offers</h3>

          {myOffers.length === 0 ? (
            <div className="empty-state">You have not posted any exchange offers yet.</div>
          ) : (
            <div className="my-offers-grid">
              {myOffers.map((offer) => {
                const status = getOfferStatus(offer);

                return (
                  <div key={offer.id} className="offer-card">
                    {editingOfferId === offer.id ? (
                      <>
                        <input
                          className="input"
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                          placeholder="Title"
                          style={{ marginBottom: "10px" }}
                        />

                        <input
                          className="input"
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm({ ...editForm, category: e.target.value })
                          }
                          placeholder="Category"
                          style={{ marginBottom: "10px" }}
                        />

                        <textarea
                          className="textarea"
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Description"
                          style={{ marginBottom: "10px" }}
                        />

                        <input
                          className="input"
                          type="date"
                          value={editForm.expiry}
                          onChange={(e) =>
                            setEditForm({ ...editForm, expiry: e.target.value })
                          }
                          style={{ marginBottom: "10px" }}
                        />

                        <input
                          className="input"
                          value={editForm.code}
                          onChange={(e) =>
                            setEditForm({ ...editForm, code: e.target.value })
                          }
                          placeholder="Offer Code"
                          style={{ marginBottom: "10px" }}
                        />

                        <div className="form-actions">
                          <button
                            className="primary-btn"
                            onClick={() => saveEditOffer(offer.id)}
                          >
                            Save
                          </button>
                          <button className="secondary-btn" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="offer-meta">
                          <span className="soft-badge">{offer.type}</span>
                          <span className="soft-badge">{offer.category}</span>
                          <span className={`status-badge ${getBadgeClass(status)}`}>
                            {status}
                          </span>
                        </div>

                        <h4>{offer.title}</h4>
                        <p>{offer.description}</p>
                        <p>
                          <strong>Expiry:</strong> {offer.expiry}
                        </p>

                        {status === "Pending Review" && (
                          <>
                            <p className="muted">
                              Your offer is under team review and will appear in Explore after approval.
                            </p>
                            <div className="form-actions">
                              <button
                                className="primary-btn"
                                onClick={() => startEditOffer(offer)}
                              >
                                Edit
                              </button>
                              <button
                                className="danger-btn"
                                onClick={() => handleDeleteOffer(offer)}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}

                        {status === "Approved" && (
                          <>
                            <p className="muted">
                              This offer is approved and live in Explore.
                            </p>
                            <div className="form-actions">
                              <button
                                className="danger-btn"
                                onClick={() => handleDeleteOffer(offer)}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}

                        {status === "Rejected" && (
                          <>
                            <p className="expired-note">
                              This offer was rejected by the review team.
                            </p>
                            {offer.rejectionReason && (
                              <p className="muted">
                                <strong>Reason:</strong> {offer.rejectionReason}
                              </p>
                            )}
                            <div className="form-actions">
                              <button
                                className="danger-btn"
                                onClick={() => handleDeleteOffer(offer)}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}

                        {status === "Exchanged" && (
                          <p className="muted">
                            This offer was exchanged successfully.
                          </p>
                        )}

                        {status === "Expired" && (
                          <p className="expired-note">
                            This approved offer has expired and is hidden from Explore.
                          </p>
                        )}

                        {status === "Busy" && (
                          <p className="muted">
                            This offer is currently involved in an active exchange.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="panel"
          style={{ marginTop: "22px", borderColor: "#fecaca" }}
        >
          <h3 style={{ color: "#b91c1c" }}>Danger Zone</h3>
          <p className="muted">
            Deleting your account will permanently remove your profile, offers,
            requests, and sign-in access from the website.
          </p>

          <div className="form-actions">
            <button
              className="danger-btn"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? "Deleting Account..." : "Delete My Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;