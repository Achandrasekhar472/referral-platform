import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

function Requests({ currentUser, goBack, goToChat, setRequests }) {
  const [receivedActive, setReceivedActive] = useState([]);
  const [sentActive, setSentActive] = useState([]);
  const [receivedHistory, setReceivedHistory] = useState([]);
  const [sentHistory, setSentHistory] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRequests = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      const received = allRequests.filter(
        (req) => req.targetOfferOwnerEmail === currentUser?.email
      );

      const sent = allRequests.filter(
        (req) => req.requestedByEmail === currentUser?.email
      );

      const isActiveRequest = (req) =>
        req.status === "pending" || req.status === "accepted";

      const isHistoryRequest = (req) =>
        req.status === "completed" ||
        req.status === "rejected" ||
        req.status === "reported";

      setReceivedActive(received.filter(isActiveRequest));
      setSentActive(sent.filter(isActiveRequest));
      setReceivedHistory(received.filter(isHistoryRequest));
      setSentHistory(sent.filter(isHistoryRequest));

      setRequests(allRequests);
    });

    return () => unsubscribe();
  }, [currentUser, setRequests]);

  const updateStatus = async (id, status) => {
    try {
      const updateData = { status };

      if (status === "rejected") {
        updateData.rejectedAt = new Date().toISOString();
      }

      if (status === "accepted") {
        updateData.acceptedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, "requests", id), updateData);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusClass = (status) => {
    if (status === "completed") return "exchanged";
    if (status === "reported") return "expired";
    if (status === "rejected") return "expired";
    if (status === "accepted") return "busy";
    return "available";
  };

  const getReviewClass = (reviewStatus) => {
    if (reviewStatus === "pending") return "busy";
    if (reviewStatus === "rejected") return "expired";
    return "available";
  };

  const getReviewText = (reviewStatus) => {
    if (reviewStatus === "pending") return "Under Review";
    if (reviewStatus === "rejected") return "Rejected";
    return "Approved";
  };

  const renderRequestCard = (req, showRequester) => (
    <div key={req.id} className="request-card">
      <div className="request-meta">
        <span className="soft-badge">{req.targetOfferType}</span>
        <span className="soft-badge">{req.targetOfferCategory}</span>
        <span className={`status-badge ${getStatusClass(req.status)}`}>
          {req.status}
        </span>
        <span
          className={`status-badge ${getReviewClass(
            req.targetOfferListingStatus || "approved"
          )}`}
        >
          {getReviewText(req.targetOfferListingStatus || "approved")}
        </span>
      </div>

      <h4>{req.targetOfferTitle}</h4>

      {showRequester ? (
        <>
          <p>Requested By: {req.requestedByName}</p>
          <p>Exchange Offer: {req.requesterOfferTitle}</p>
        </>
      ) : (
        <>
          <p>Offer Owner: {req.targetOfferOwnerName}</p>
          <p>Your Exchange Offer: {req.requesterOfferTitle}</p>
        </>
      )}

      {showRequester && req.status === "pending" && (
        <div className="form-actions">
          <button
            className="primary-btn"
            onClick={() => updateStatus(req.id, "accepted")}
          >
            Accept
          </button>
          <button
            className="secondary-btn"
            onClick={() => updateStatus(req.id, "rejected")}
          >
            Reject
          </button>
        </div>
      )}

      {req.status === "accepted" && (
        <div className="form-actions">
          <button className="primary-btn" onClick={() => goToChat(req)}>
            Open Chat
          </button>
        </div>
      )}

      {req.status === "completed" && (
        <p className="muted">This exchange was completed successfully.</p>
      )}

      {req.status === "reported" && (
        <p className="expired-note">This exchange was reported and closed for admin review.</p>
      )}

      {req.status === "rejected" && (
        <p className="muted">This exchange was rejected.</p>
      )}
    </div>
  );

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        <h2 className="section-title">Exchange Requests</h2>
        <p className="section-subtitle">
          Active exchanges stay here. Completed, rejected, and reported exchanges move to history.
        </p>

        <div style={{ marginTop: "30px" }}>
          <h3>Active Requests On My Offers</h3>
          {receivedActive.length === 0 ? (
            <div className="empty-state">No active received requests.</div>
          ) : (
            <div className="requests-grid">
              {receivedActive.map((req) => renderRequestCard(req, true))}
            </div>
          )}
        </div>

        <div style={{ marginTop: "36px" }}>
          <h3>Active Requests I Sent</h3>
          {sentActive.length === 0 ? (
            <div className="empty-state">No active sent requests.</div>
          ) : (
            <div className="requests-grid">
              {sentActive.map((req) => renderRequestCard(req, false))}
            </div>
          )}
        </div>

        <div style={{ marginTop: "36px" }}>
          <h3>Received History</h3>
          {receivedHistory.length === 0 ? (
            <div className="empty-state">No received history.</div>
          ) : (
            <div className="requests-grid">
              {receivedHistory.map((req) => renderRequestCard(req, true))}
            </div>
          )}
        </div>

        <div style={{ marginTop: "36px" }}>
          <h3>Sent History</h3>
          {sentHistory.length === 0 ? (
            <div className="empty-state">No sent history.</div>
          ) : (
            <div className="requests-grid">
              {sentHistory.map((req) => renderRequestCard(req, false))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Requests;