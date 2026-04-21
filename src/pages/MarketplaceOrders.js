import React, { useMemo, useState } from "react";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

function MarketplaceOrders({
  currentUser,
  orders,
  selectedOrder,
  setSelectedOrderId,
  goBack,
}) {
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportIssueType, setReportIssueType] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [activeTab, setActiveTab] = useState("purchases");

  const myPurchases = useMemo(() => {
    return orders
      .filter((o) => o.buyerId === currentUser?.uid)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [orders, currentUser]);

  const mySales = useMemo(() => {
    return orders
      .filter((o) => o.sellerId === currentUser?.uid)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [orders, currentUser]);

  const visibleOrders = activeTab === "purchases" ? myPurchases : mySales;

  const activeOrder =
    selectedOrder ||
    visibleOrders.find((o) => o.id) ||
    null;

  const getPaymentBadgeClass = (status) => {
    if (status === "paid") return "available";
    if (status === "rejected") return "expired";
    return "busy";
  };

  const getOrderBadgeClass = (status) => {
    if (status === "completed") return "exchanged";
    if (status === "reported") return "expired";
    if (status === "revealed") return "available";
    return "busy";
  };

  const markPaymentSubmitted = async (order) => {
    try {
      setLoadingAction("payment");

      await updateDoc(doc(db, "marketplaceOrders", order.id), {
        paymentStatus: "submitted",
        orderStatus: "awaiting_verification",
        paymentSubmittedAt: new Date().toISOString(),
      });

      setNotice({
        type: "success",
        text: "Payment marked as submitted. Admin will verify and reveal the code after approval.",
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingAction("");
    }
  };

  const markCompleted = async (order) => {
    try {
      setLoadingAction("complete");

      await updateDoc(doc(db, "marketplaceOrders", order.id), {
        orderStatus: "completed",
        completedAt: new Date().toISOString(),
        earningStatus: "available",
      });

      setNotice({ type: "success", text: "Order marked as completed." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingAction("");
    }
  };

  const submitReport = async (order) => {
    if (!reportIssueType) {
      setNotice({ type: "error", text: "Please select a report issue." });
      return;
    }

    try {
      setLoadingAction("report");

      await addDoc(collection(db, "marketplaceReports"), {
        orderId: order.id,
        listingId: order.listingId || "",
        requestId: order.requestId || "",
        buyerId: order.buyerId,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        sellerId: order.sellerId,
        sellerName: order.sellerName,
        sellerEmail: order.sellerEmail,
        issueType: reportIssueType,
        details: reportDetails.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "marketplaceOrders", order.id), {
        reported: true,
        reportStatus: "open",
        orderStatus: "reported",
        reportedAt: new Date().toISOString(),
        earningStatus: "pending",
      });

      setShowReportBox(false);
      setReportIssueType("");
      setReportDetails("");
      setNotice({ type: "success", text: "Report submitted successfully." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoadingAction("");
    }
  };

  const renderOrderCard = (order, mode) => {
    return (
      <div
        key={order.id}
        className="request-card clickable"
        onClick={() => setSelectedOrderId(order.id)}
      >
        <div className="request-meta">
          <span className="soft-badge">{order.sourceModel}</span>
          <span className="soft-badge">{order.type}</span>
          <span className={`status-badge ${getPaymentBadgeClass(order.paymentStatus)}`}>
            {order.paymentStatus}
          </span>
          <span className={`status-badge ${getOrderBadgeClass(order.orderStatus)}`}>
            {order.orderStatus}
          </span>
        </div>

        <h4>{order.title}</h4>
        <p><strong>Amount:</strong> ₹{order.amount}</p>

        {mode === "purchase" ? (
          <p><strong>Seller:</strong> {order.sellerName}</p>
        ) : (
          <p><strong>Buyer:</strong> {order.buyerName}</p>
        )}

        {mode === "sale" && (
          <p><strong>Your Amount:</strong> ₹{order.sellerAmount}</p>
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

        <h2 className="section-title">My Orders</h2>
        <p className="section-subtitle">
          Track your purchases and sales separately, including payment, revealed code, reports, and earnings.
        </p>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        <div className="form-actions" style={{ marginBottom: "18px" }}>
          <button
            className={activeTab === "purchases" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("purchases")}
          >
            My Purchases
          </button>
          <button
            className={activeTab === "sales" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("sales")}
          >
            My Sales
          </button>
        </div>

        <div className="profile-grid">
          <div className="panel">
            <h3>{activeTab === "purchases" ? "My Purchases" : "My Sales"}</h3>

            {visibleOrders.length === 0 ? (
              <div className="empty-state">
                {activeTab === "purchases"
                  ? "No purchases yet."
                  : "No sales yet."}
              </div>
            ) : (
              <div className="requests-grid">
                {activeTab === "purchases"
                  ? visibleOrders.map((order) => renderOrderCard(order, "purchase"))
                  : visibleOrders.map((order) => renderOrderCard(order, "sale"))}
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Order Details</h3>

            {!activeOrder ? (
              <div className="empty-state">Select an order to view details.</div>
            ) : (
              <>
                <p><strong>Title:</strong> {activeOrder.title}</p>
                <p><strong>Model:</strong> {activeOrder.sourceModel}</p>
                <p><strong>Type:</strong> {activeOrder.type}</p>
                <p><strong>Category:</strong> {activeOrder.category}</p>
                <p><strong>Amount:</strong> ₹{activeOrder.amount}</p>
                <p><strong>Buyer:</strong> {activeOrder.buyerName}</p>
                <p><strong>Seller:</strong> {activeOrder.sellerName}</p>
                <p><strong>Payment Status:</strong> {activeOrder.paymentStatus}</p>
                <p><strong>Order Status:</strong> {activeOrder.orderStatus}</p>

                {currentUser?.uid === activeOrder.buyerId &&
                  activeOrder.paymentStatus === "pending" && (
                    <div className="panel" style={{ marginTop: "14px", padding: "16px" }}>
                      <h3>Payment Instructions</h3>
                      <p>Pay the exact amount to your platform bank/UPI account.</p>
                      <p><strong>Amount to pay:</strong> ₹{activeOrder.amount}</p>
                      <p><strong>After payment:</strong> click the button below.</p>

                      <div className="form-actions">
                        <button
                          className="primary-btn"
                          onClick={() => markPaymentSubmitted(activeOrder)}
                          disabled={loadingAction === "payment"}
                        >
                          {loadingAction === "payment" ? "Submitting..." : "I Have Paid"}
                        </button>
                      </div>
                    </div>
                  )}

                {activeOrder.paymentStatus === "submitted" && (
                  <div className="empty-state" style={{ marginTop: "14px" }}>
                    Payment submitted. Waiting for admin verification.
                  </div>
                )}

                {activeOrder.paymentStatus === "rejected" && (
                  <div className="empty-state" style={{ marginTop: "14px" }}>
                    Payment was rejected. Please repay and submit again.
                  </div>
                )}

                {activeOrder.paymentStatus === "paid" && activeOrder.revealed && (
                  <div className="panel" style={{ marginTop: "14px", padding: "16px" }}>
                    <h3>Code Revealed</h3>
                    <p><strong>Code:</strong> {activeOrder.listingCode || "Not available"}</p>

                    {currentUser?.uid === activeOrder.buyerId &&
                      activeOrder.orderStatus !== "completed" &&
                      activeOrder.orderStatus !== "reported" && (
                        <div className="form-actions">
                          <button
                            className="primary-btn"
                            onClick={() => markCompleted(activeOrder)}
                            disabled={loadingAction === "complete"}
                          >
                            {loadingAction === "complete" ? "Saving..." : "Mark as Completed"}
                          </button>

                          <button
                            className="danger-btn"
                            onClick={() => setShowReportBox(true)}
                          >
                            Report Problem
                          </button>
                        </div>
                      )}
                  </div>
                )}

                {currentUser?.uid === activeOrder.sellerId && (
                  <div className="panel" style={{ marginTop: "14px", padding: "16px" }}>
                    <h3>Sale Earnings</h3>
                    <p><strong>Platform Fee:</strong> ₹{activeOrder.platformFee}</p>
                    <p><strong>Your Amount:</strong> ₹{activeOrder.sellerAmount}</p>
                    <p><strong>Earning Status:</strong> {activeOrder.earningStatus}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {showReportBox && activeOrder && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Report Problem</h3>

              <select
                className="select"
                value={reportIssueType}
                onChange={(e) => setReportIssueType(e.target.value)}
              >
                <option value="">Select issue</option>
                <option value="Fake code">Fake code</option>
                <option value="Used or invalid code">Used or invalid code</option>
                <option value="Misleading offer">Misleading offer</option>
                <option value="Wrong item">Wrong item</option>
                <option value="Other">Other</option>
              </select>

              <textarea
                className="textarea"
                placeholder="Explain the issue"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                style={{ marginTop: "12px" }}
              />

              <div className="form-actions">
                <button
                  className="danger-btn"
                  onClick={() => submitReport(activeOrder)}
                  disabled={loadingAction === "report"}
                >
                  {loadingAction === "report" ? "Submitting..." : "Submit Report"}
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

export default MarketplaceOrders;