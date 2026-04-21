import React, { useEffect, useState } from "react";
import {
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "../firebase";

function Chat({ request, goBack, currentUser }) {
  const [liveRequest, setLiveRequest] = useState(null);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loadingAction, setLoadingAction] = useState("");
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportIssueType, setReportIssueType] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  useEffect(() => {
    if (!request?.id) return;

    const unsubscribe = onSnapshot(doc(db, "requests", request.id), (docSnap) => {
      if (docSnap.exists()) {
        setLiveRequest({
          id: docSnap.id,
          ...docSnap.data(),
        });
      }
    });

    return () => unsubscribe();
  }, [request]);

  if (!request?.id) {
    return (
      <div className="app-page">
        <div className="container">
          <button className="secondary-btn back-btn" onClick={goBack}>
            ⬅ Back
          </button>
          <div className="empty-state">No request selected.</div>
        </div>
      </div>
    );
  }

  if (!liveRequest) {
    return (
      <div className="app-page">
        <div className="container">
          <button className="secondary-btn back-btn" onClick={goBack}>
            ⬅ Back
          </button>
          <div className="empty-state">Loading chat...</div>
        </div>
      </div>
    );
  }

  const isFinalState =
    liveRequest.status === "completed" || liveRequest.status === "reported";

  const targetOfferId = liveRequest.targetOfferId || liveRequest.offerId || null;
  const requesterOfferId = liveRequest.requesterOfferId || null;

  const sendMessage = async () => {
    setNotice({ type: "", text: "" });

    if (isFinalState) {
      setNotice({
        type: "error",
        text: "This exchange is already closed. No more messages can be sent.",
      });
      return;
    }

    if (!input.trim()) {
      setNotice({ type: "error", text: "Please type a message first." });
      return;
    }

    const newMessage = {
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      text: input.trim(),
      time: new Date().toLocaleString(),
    };

    try {
      setLoadingAction("message");
      await updateDoc(doc(db, "requests", liveRequest.id), {
        messages: arrayUnion(newMessage),
      });
      setInput("");
      setNotice({ type: "success", text: "Message sent." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingAction("");
    }
  };

  const handleReveal = async () => {
    setNotice({ type: "", text: "" });

    try {
      setLoadingAction("reveal");
      await updateDoc(doc(db, "requests", liveRequest.id), {
        revealed: true,
        revealedAt: new Date().toISOString(),
      });
      setNotice({ type: "success", text: "Both codes revealed successfully." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingAction("");
    }
  };

  const handleComplete = async () => {
    setNotice({ type: "", text: "" });

    try {
      setLoadingAction("complete");

      await updateDoc(doc(db, "requests", liveRequest.id), {
        completed: true,
        completedAt: new Date().toISOString(),
        status: "completed",
      });

      if (targetOfferId) {
        await updateDoc(doc(db, "offers", targetOfferId), {
          isActive: false,
          exchangeStatus: "exchanged",
          exchangedAt: new Date().toISOString(),
        });
      }

      if (requesterOfferId) {
        await updateDoc(doc(db, "offers", requesterOfferId), {
          isActive: false,
          exchangeStatus: "exchanged",
          exchangedAt: new Date().toISOString(),
        });
      }

      setNotice({ type: "success", text: "Exchange marked as completed." });

      setTimeout(() => {
        goBack();
      }, 700);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingAction("");
    }
  };

  const handleRating = async (value) => {
    setNotice({ type: "", text: "" });

    try {
      setLoadingAction("rating");
      await updateDoc(doc(db, "requests", liveRequest.id), {
        rating: value,
      });
      setNotice({
        type: "success",
        text: `You rated this exchange ${value} stars.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingAction("");
    }
  };

  const handleSubmitReport = async () => {
    setNotice({ type: "", text: "" });

    if (!reportIssueType) {
      setNotice({ type: "error", text: "Please select a report issue." });
      return;
    }

    try {
      setLoadingAction("report");

      const reportedUserId =
        currentUser.uid === liveRequest.targetOfferOwnerId
          ? liveRequest.requestedById
          : liveRequest.targetOfferOwnerId;

      const reportedUserName =
        currentUser.uid === liveRequest.targetOfferOwnerId
          ? liveRequest.requestedByName
          : liveRequest.targetOfferOwnerName;

      const reportedUserEmail =
        currentUser.uid === liveRequest.targetOfferOwnerId
          ? liveRequest.requestedByEmail
          : liveRequest.targetOfferOwnerEmail;

      await addDoc(collection(db, "reports"), {
        reportType: "exchange",
        requestId: liveRequest.id,
        targetOfferId: targetOfferId || "",
        requesterOfferId: requesterOfferId || "",
        reportedUserId,
        reportedUserName,
        reportedUserEmail,
        reportedById: currentUser.uid,
        reportedByName: currentUser.name,
        reportedByEmail: currentUser.email,
        issueType: reportIssueType,
        details: reportDetails.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "requests", liveRequest.id), {
        status: "reported",
        reportedAt: new Date().toISOString(),
      });

      setShowReportBox(false);
      setReportIssueType("");
      setReportDetails("");
      setNotice({
        type: "success",
        text: "Report submitted successfully. This exchange is now closed.",
      });

      setTimeout(() => {
        goBack();
      }, 700);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="app-page">
      <div className="container">
        {(!liveRequest.revealed ||
          isFinalState ||
          liveRequest.status === "rejected") && (
          <button className="secondary-btn back-btn" onClick={goBack}>
            ⬅ Back
          </button>
        )}

        <h2 className="section-title">Exchange Chat</h2>
        <p className="section-subtitle">
          Coordinate the exchange, reveal both codes after acceptance, then
          either complete or report the exchange.
        </p>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        <div className="profile-grid">
          <div className="panel">
            <h3>Exchange Summary</h3>
            <p>
              <strong>Status:</strong> {liveRequest.status}
            </p>
            <p>
              <strong>Requested Offer:</strong>{" "}
              {liveRequest.targetOfferTitle || liveRequest.offerTitle || "N/A"}
            </p>
            <p>
              <strong>Owner:</strong>{" "}
              {liveRequest.targetOfferOwnerName ||
                liveRequest.offerOwnerName ||
                "N/A"}
            </p>
            <p>
              <strong>Requester Offer:</strong>{" "}
              {liveRequest.requesterOfferTitle || "N/A"}
            </p>
            <p>
              <strong>Requester:</strong> {liveRequest.requestedByName || "N/A"}
            </p>

            {liveRequest.status === "rejected" && (
              <div
                className="empty-state"
                style={{ marginTop: "14px", padding: "16px" }}
              >
                This exchange was rejected. Codes cannot be revealed and chat is
                closed.
              </div>
            )}

            {liveRequest.status === "reported" && (
              <div
                className="empty-state"
                style={{ marginTop: "14px", padding: "16px" }}
              >
                This exchange was reported and is now closed pending admin
                review.
              </div>
            )}

            {liveRequest.status === "accepted" && !liveRequest.revealed && (
              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={handleReveal}
                  disabled={loadingAction === "reveal"}
                >
                  {loadingAction === "reveal"
                    ? "Revealing..."
                    : "Reveal Both Codes"}
                </button>
              </div>
            )}

            {liveRequest.revealed && (
              <div
                className="panel"
                style={{ padding: "16px", marginTop: "14px" }}
              >
                <h3>Codes Revealed</h3>

                <p>
                  <strong>
                    {liveRequest.targetOfferOwnerName ||
                      liveRequest.offerOwnerName}
                    's Offer:
                  </strong>{" "}
                  {liveRequest.targetOfferTitle ||
                    liveRequest.offerTitle ||
                    "N/A"}
                </p>
                <p>
                  <strong>
                    {liveRequest.targetOfferOwnerName ||
                      liveRequest.offerOwnerName}
                    's Code:
                  </strong>{" "}
                  {liveRequest.targetOfferCode ||
                    liveRequest.ownerCode ||
                    liveRequest.code ||
                    "Not available"}
                </p>

                <div className="divider"></div>

                <p>
                  <strong>
                    {liveRequest.requestedByName || "Requester"}'s Offer:
                  </strong>{" "}
                  {liveRequest.requesterOfferTitle || "N/A"}
                </p>
                <p>
                  <strong>
                    {liveRequest.requestedByName || "Requester"}'s Code:
                  </strong>{" "}
                  {liveRequest.requesterOfferCode || "Not available"}
                </p>
              </div>
            )}

            {liveRequest.revealed && !isFinalState && (
              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={handleComplete}
                  disabled={loadingAction === "complete"}
                >
                  {loadingAction === "complete"
                    ? "Completing..."
                    : "Mark as Completed"}
                </button>

                <button
                  className="danger-btn"
                  onClick={() => setShowReportBox(true)}
                  disabled={loadingAction === "report"}
                >
                  Report Exchange
                </button>
              </div>
            )}

            {liveRequest.completed && (
              <div style={{ marginTop: "16px" }}>
                <h3>Rate User</h3>
                <div
                  style={{ display: "flex", gap: "8px", fontSize: "28px" }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => handleRating(star)}
                      style={{
                        cursor: "pointer",
                        color:
                          star <= (liveRequest.rating || 0)
                            ? "gold"
                            : "#cbd5e1",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {loadingAction === "rating" && (
                  <p className="muted">Saving rating...</p>
                )}
                {liveRequest.rating > 0 && (
                  <p>You rated: {liveRequest.rating} ⭐</p>
                )}
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Messages</h3>

            <div
              style={{
                border: "1px solid #dbe7ff",
                height: "300px",
                overflowY: "auto",
                padding: "14px",
                borderRadius: "16px",
                background: "#f9fbff",
              }}
            >
              {!liveRequest.messages || liveRequest.messages.length === 0 ? (
                <p className="muted">No messages yet.</p>
              ) : (
                liveRequest.messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "12px",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      background: "white",
                      border: "1px solid #e5edff",
                    }}
                  >
                    <strong>{msg.senderName}</strong>
                    <p style={{ margin: "6px 0" }}>{msg.text}</p>
                    <small className="muted">{msg.time}</small>
                  </div>
                ))
              )}
            </div>

            {!isFinalState && liveRequest.status !== "rejected" && (
              <div className="form-actions" style={{ marginTop: "12px" }}>
                <input
                  className="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  style={{ flex: 1 }}
                />
                <button
                  className="primary-btn"
                  onClick={sendMessage}
                  disabled={loadingAction === "message"}
                >
                  {loadingAction === "message" ? "Sending..." : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>

        {showReportBox && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Report Exchange</h3>
              <p>Select the issue and explain what happened.</p>

              <label
                style={{
                  marginTop: "14px",
                  display: "block",
                  fontWeight: 600,
                }}
              >
                Issue Type
              </label>
              <select
                className="select"
                value={reportIssueType}
                onChange={(e) => setReportIssueType(e.target.value)}
              >
                <option value="">Select issue</option>
                <option value="Fake code">Fake code</option>
                <option value="Used or invalid code">
                  Used or invalid code
                </option>
                <option value="Scam or suspicious behavior">
                  Scam or suspicious behavior
                </option>
                <option value="Abusive language">Abusive language</option>
                <option value="Misleading offer">Misleading offer</option>
                <option value="Other">Other</option>
              </select>

              <label
                style={{
                  marginTop: "14px",
                  display: "block",
                  fontWeight: 600,
                }}
              >
                Details
              </label>
              <textarea
                className="textarea"
                placeholder="Explain the issue..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />

              <div className="form-actions">
                <button
                  className="danger-btn"
                  onClick={handleSubmitReport}
                  disabled={loadingAction === "report"}
                >
                  {loadingAction === "report"
                    ? "Submitting..."
                    : "Submit Report"}
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => setShowReportBox(false)}
                >
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

export default Chat;