import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

function BuyRequestsBoard({
  currentUser,
  isLoggedIn,
  goBack,
  goToLogin,
  onOpenOrder,
}) {
  const [requests, setRequests] = useState([]);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const [needTitle, setNeedTitle] = useState("");
  const [needType, setNeedType] = useState("");
  const [needCategory, setNeedCategory] = useState("");
  const [needDescription, setNeedDescription] = useState("");
  const [needBudget, setNeedBudget] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseCode, setResponseCode] = useState("");
  const [responsePrice, setResponsePrice] = useState("");
  const [responseMessage, setResponseMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "buyRequests"), (snapshot) => {
      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setRequests(data);
    });

    return () => unsubscribe();
  }, []);

  const openRequests = useMemo(() => {
    return requests
      .filter((item) => item.status === "open")
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [requests]);

  const myRequests = useMemo(() => {
    if (!currentUser?.uid) return [];
    return requests
      .filter((item) => item.buyerId === currentUser.uid)
      .sort((a, b) => {
        const dateA = b.updatedAt || b.acceptedAt || b.matchedAt || b.createdAt || "";
        const dateB = a.updatedAt || a.acceptedAt || a.matchedAt || a.createdAt || "";
        return dateA.localeCompare(dateB);
      });
  }, [requests, currentUser]);

  const myOpenRequests = useMemo(
    () => myRequests.filter((item) => item.status === "open"),
    [myRequests]
  );

  const myMatchedRequests = useMemo(
    () => myRequests.filter((item) => item.status === "matched"),
    [myRequests]
  );

  const myAcceptedRequests = useMemo(
    () => myRequests.filter((item) => item.status === "accepted"),
    [myRequests]
  );

  const myClosedRequests = useMemo(
    () => myRequests.filter((item) => item.status === "closed"),
    [myRequests]
  );

  const myCancelledRequests = useMemo(
    () => myRequests.filter((item) => item.status === "cancelled"),
    [myRequests]
  );

  const submitBuyRequest = async () => {
    setNotice({ type: "", text: "" });

    if (!isLoggedIn) {
      goToLogin();
      return;
    }

    if (!needTitle || !needType || !needCategory || !needDescription) {
      setNotice({ type: "error", text: "Please fill all required request fields." });
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "buyRequests"), {
        buyerId: currentUser.uid,
        buyerName: currentUser.name,
        buyerEmail: currentUser.email,
        title: needTitle,
        type: needType,
        category: needCategory,
        description: needDescription,
        budget: needBudget ? Number(needBudget) : 0,

        status: "open",

        sellerId: "",
        sellerName: "",
        sellerEmail: "",
        sellerCode: "",
        sellerPrice: 0,
        sellerMessage: "",

        matchedAt: "",
        acceptedAt: "",
        closedAt: "",
        cancelledAt: "",
        updatedAt: new Date().toISOString(),

        createdAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "Buy request posted successfully." });
      setNeedTitle("");
      setNeedType("");
      setNeedCategory("");
      setNeedDescription("");
      setNeedBudget("");
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async () => {
    setNotice({ type: "", text: "" });

    if (!isLoggedIn) {
      goToLogin();
      return;
    }

    if (!selectedRequest) {
      setNotice({ type: "error", text: "No request selected." });
      return;
    }

    if (selectedRequest.buyerId === currentUser?.uid) {
      setNotice({ type: "error", text: "You cannot respond to your own request." });
      return;
    }

    if (!responseCode || !responsePrice) {
      setNotice({ type: "error", text: "Please enter code and price." });
      return;
    }

    try {
      setLoading(true);

      await updateDoc(doc(db, "buyRequests", selectedRequest.id), {
        status: "matched",
        sellerId: currentUser.uid,
        sellerName: currentUser.name,
        sellerEmail: currentUser.email,
        sellerCode: responseCode,
        sellerPrice: Number(responsePrice),
        sellerMessage: responseMessage,
        matchedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSelectedRequest(null);
      setResponseCode("");
      setResponsePrice("");
      setResponseMessage("");

      setNotice({
        type: "success",
        text: "Response sent. Buyer can now review and accept it.",
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const acceptSellerResponse = async (requestItem) => {
    setNotice({ type: "", text: "" });

    if (!currentUser?.uid || requestItem.buyerId !== currentUser.uid) {
      setNotice({ type: "error", text: "Only the buyer can accept this response." });
      return;
    }

    if (requestItem.status !== "matched") {
      setNotice({ type: "error", text: "This request is not ready for acceptance." });
      return;
    }

    try {
      setLoading(true);

      await updateDoc(doc(db, "buyRequests", requestItem.id), {
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const platformFee = Math.round(Number(requestItem.sellerPrice) * 0.1);
      const sellerAmount = Number(requestItem.sellerPrice) - platformFee;

      const orderRef = await addDoc(collection(db, "marketplaceOrders"), {
        sourceModel: "C",
        listingId: "",
        requestId: requestItem.id,
        title: requestItem.title,
        type: requestItem.type,
        category: requestItem.category,
        listingCode: requestItem.sellerCode,

        buyerId: requestItem.buyerId,
        buyerName: requestItem.buyerName,
        buyerEmail: requestItem.buyerEmail,

        sellerId: requestItem.sellerId,
        sellerName: requestItem.sellerName,
        sellerEmail: requestItem.sellerEmail,

        amount: Number(requestItem.sellerPrice),
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

      setNotice({
        type: "success",
        text: "Seller response accepted. Your order has been created.",
      });

      if (onOpenOrder) {
        onOpenOrder(orderRef.id);
      }
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const cancelMyOpenRequest = async (requestId) => {
    try {
      await updateDoc(doc(db, "buyRequests", requestId), {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "Buy request cancelled." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const renderRequestCard = (item, mode = "default") => {
    return (
      <div key={item.id} className="offer-card">
        <div className="offer-meta">
          <span className="soft-badge">{item.type}</span>
          <span className="soft-badge">{item.category}</span>
          <span
            className={`status-badge ${
              item.status === "open"
                ? "available"
                : item.status === "matched"
                ? "busy"
                : item.status === "accepted"
                ? "available"
                : item.status === "closed"
                ? "exchanged"
                : "expired"
            }`}
          >
            {item.status}
          </span>
        </div>

        <h4>{item.title}</h4>
        <p><strong>Description:</strong> {item.description}</p>
        {item.budget > 0 && <p><strong>Budget:</strong> ₹{item.budget}</p>}

        {mode === "seller-open" && (
          <>
            <p><strong>Buyer:</strong> {item.buyerName}</p>
            <div className="form-actions">
              <button
                className="primary-btn"
                onClick={() => setSelectedRequest(item)}
              >
                Respond
              </button>
            </div>
          </>
        )}

        {mode === "buyer-matched" && (
          <>
            <p><strong>Seller:</strong> {item.sellerName}</p>
            <p><strong>Price:</strong> ₹{item.sellerPrice}</p>
            <p><strong>Seller Note:</strong> {item.sellerMessage || "No note"}</p>
            <div className="form-actions">
              <button
                className="primary-btn"
                onClick={() => acceptSellerResponse(item)}
                disabled={loading}
              >
                {loading ? "Processing..." : "Accept & Continue"}
              </button>
            </div>
          </>
        )}

        {mode === "buyer-open" && (
          <div className="form-actions">
            <button
              className="danger-btn"
              onClick={() => cancelMyOpenRequest(item.id)}
            >
              Cancel Request
            </button>
          </div>
        )}

        {mode === "buyer-accepted" && (
          <p className="muted">
            Seller response accepted. Order created and waiting for payment flow.
          </p>
        )}

        {mode === "buyer-closed" && (
          <p className="muted">
            This request was completed and closed after payment approval.
          </p>
        )}

        {mode === "buyer-cancelled" && (
          <p className="muted">
            This request was cancelled by you before order creation.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        <h2 className="section-title">Buy Requests</h2>
        <p className="section-subtitle">
          Post what you need, review seller responses, and track your full request history.
        </p>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        <div className="profile-grid">
          <div className="form-card">
            <h3>Post What You Need</h3>

            <input
              className="input"
              placeholder="Request title"
              value={needTitle}
              onChange={(e) => setNeedTitle(e.target.value)}
              style={{ marginBottom: "12px" }}
            />

            <select
              className="select"
              value={needType}
              onChange={(e) => setNeedType(e.target.value)}
              style={{ marginBottom: "12px" }}
            >
              <option value="">Select Type</option>
              <option value="Referral">Referral</option>
              <option value="Coupon">Coupon</option>
              <option value="Promo">Promo</option>
              <option value="Voucher">Voucher</option>
            </select>

            <select
              className="select"
              value={needCategory}
              onChange={(e) => setNeedCategory(e.target.value)}
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

            <textarea
              className="textarea"
              placeholder="Describe what you need"
              value={needDescription}
              onChange={(e) => setNeedDescription(e.target.value)}
              style={{ marginBottom: "12px" }}
            />

            <input
              className="input"
              type="number"
              placeholder="Budget (optional)"
              value={needBudget}
              onChange={(e) => setNeedBudget(e.target.value)}
              style={{ marginBottom: "12px" }}
            />

            <div className="form-actions">
              <button className="primary-btn" onClick={submitBuyRequest} disabled={loading}>
                {loading ? "Posting..." : "Post Buy Request"}
              </button>
            </div>
          </div>

          <div className="panel">
            <h3>Open Requests Users Can Respond To</h3>

            {openRequests.length === 0 ? (
              <div className="empty-state">No open buy requests.</div>
            ) : (
              <div className="requests-grid">
                {openRequests.map((item) =>
                  !isLoggedIn || currentUser?.uid === item.buyerId
                    ? renderRequestCard(item)
                    : renderRequestCard(item, "seller-open")
                )}
              </div>
            )}
          </div>
        </div>

        {isLoggedIn && currentUser && (
          <>
            <div className="section-block">
              <h3>Matched Requests Waiting For My Acceptance</h3>
              {myMatchedRequests.length === 0 ? (
                <div className="empty-state">No matched requests waiting for your acceptance.</div>
              ) : (
                <div className="offers-grid">
                  {myMatchedRequests.map((item) => renderRequestCard(item, "buyer-matched"))}
                </div>
              )}
            </div>

            <div className="section-block">
              <h3>My Open Requests</h3>
              {myOpenRequests.length === 0 ? (
                <div className="empty-state">No open requests.</div>
              ) : (
                <div className="offers-grid">
                  {myOpenRequests.map((item) => renderRequestCard(item, "buyer-open"))}
                </div>
              )}
            </div>

            <div className="section-block">
              <h3>My Accepted Requests</h3>
              {myAcceptedRequests.length === 0 ? (
                <div className="empty-state">No accepted requests yet.</div>
              ) : (
                <div className="offers-grid">
                  {myAcceptedRequests.map((item) => renderRequestCard(item, "buyer-accepted"))}
                </div>
              )}
            </div>

            <div className="section-block">
              <h3>My Closed Requests</h3>
              {myClosedRequests.length === 0 ? (
                <div className="empty-state">No closed requests yet.</div>
              ) : (
                <div className="offers-grid">
                  {myClosedRequests.map((item) => renderRequestCard(item, "buyer-closed"))}
                </div>
              )}
            </div>

            <div className="section-block">
              <h3>My Cancelled Requests</h3>
              {myCancelledRequests.length === 0 ? (
                <div className="empty-state">No cancelled requests yet.</div>
              ) : (
                <div className="offers-grid">
                  {myCancelledRequests.map((item) => renderRequestCard(item, "buyer-cancelled"))}
                </div>
              )}
            </div>
          </>
        )}

        {selectedRequest && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Respond to Buy Request</h3>
              <p><strong>Title:</strong> {selectedRequest.title}</p>
              <p><strong>Buyer:</strong> {selectedRequest.buyerName}</p>
              <p><strong>Description:</strong> {selectedRequest.description}</p>

              <input
                className="input"
                placeholder="Code you are offering"
                value={responseCode}
                onChange={(e) => setResponseCode(e.target.value)}
                style={{ marginTop: "12px", marginBottom: "12px" }}
              />

              <input
                className="input"
                type="number"
                placeholder="Your price"
                value={responsePrice}
                onChange={(e) => setResponsePrice(e.target.value)}
                style={{ marginBottom: "12px" }}
              />

              <textarea
                className="textarea"
                placeholder="Optional seller note"
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                style={{ marginBottom: "12px" }}
              />

              <div className="form-actions">
                <button className="primary-btn" onClick={respondToRequest} disabled={loading}>
                  {loading ? "Submitting..." : "Submit Response"}
                </button>
                <button className="secondary-btn" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyRequestsBoard;