import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

function AdminMarketplace({ goBack }) {
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [rejectingListingId, setRejectingListingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("listings");

  useEffect(() => {
    const unsubListings = onSnapshot(
      query(collection(db, "marketplaceListings"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setListings(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
      }
    );

    const unsubOrders = onSnapshot(
      query(collection(db, "marketplaceOrders"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setOrders(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
      }
    );

    const unsubReports = onSnapshot(
      query(collection(db, "marketplaceReports"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setReports(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
      }
    );

    const unsubWithdraws = onSnapshot(
      query(collection(db, "withdrawRequests"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setWithdrawRequests(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
      }
    );

    return () => {
      unsubListings();
      unsubOrders();
      unsubReports();
      unsubWithdraws();
    };
  }, []);

  const pendingListings = useMemo(
    () => listings.filter((item) => item.listingStatus === "pending"),
    [listings]
  );

  const paymentQueue = useMemo(
    () => orders.filter((item) => item.paymentStatus === "submitted"),
    [orders]
  );

  const openReports = useMemo(
    () => reports.filter((item) => item.status === "open"),
    [reports]
  );

  const pendingWithdrawals = useMemo(
    () => withdrawRequests.filter((item) => item.status === "pending"),
    [withdrawRequests]
  );

  const approveListing = async (listingId) => {
    try {
      await updateDoc(doc(db, "marketplaceListings", listingId), {
        listingStatus: "approved",
        approvedAt: new Date().toISOString(),
        rejectionReason: "",
      });

      setNotice({ type: "success", text: "Marketplace listing approved." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const rejectListing = async () => {
    if (!rejectingListingId) return;

    if (!rejectionReason.trim()) {
      setNotice({ type: "error", text: "Please enter a rejection reason." });
      return;
    }

    try {
      await updateDoc(doc(db, "marketplaceListings", rejectingListingId), {
        listingStatus: "rejected",
        rejectionReason: rejectionReason.trim(),
        rejectedAt: new Date().toISOString(),
      });

      setRejectingListingId(null);
      setRejectionReason("");
      setNotice({ type: "success", text: "Marketplace listing rejected." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const markOrderPaid = async (order) => {
    try {
      await updateDoc(doc(db, "marketplaceOrders", order.id), {
        paymentStatus: "paid",
        orderStatus: "revealed",
        revealed: true,
        revealedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      });

      if (order.listingId) {
        await updateDoc(doc(db, "marketplaceListings", order.listingId), {
          sold: true,
          isActive: false,
          soldAt: new Date().toISOString(),
        });
      }

      if (order.requestId) {
        await updateDoc(doc(db, "buyRequests", order.requestId), {
          status: "closed",
          closedAt: new Date().toISOString(),
        });
      }

      setNotice({ type: "success", text: "Order marked paid and code revealed." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const rejectPayment = async (orderId) => {
    try {
      await updateDoc(doc(db, "marketplaceOrders", orderId), {
        paymentStatus: "rejected",
        orderStatus: "awaiting_payment",
        rejectedAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "Payment rejected." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const resolveReport = async (reportId, orderId) => {
    try {
      await updateDoc(doc(db, "marketplaceReports", reportId), {
        status: "resolved",
        resolvedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "marketplaceOrders", orderId), {
        reportStatus: "resolved",
        earningStatus: "available",
      });

      setNotice({ type: "success", text: "Marketplace report resolved." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const markWithdrawalPaid = async (requestId) => {
    try {
      await updateDoc(doc(db, "withdrawRequests", requestId), {
        status: "paid",
        paidAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "Withdrawal marked as paid." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const rejectWithdrawal = async (requestId) => {
    try {
      await updateDoc(doc(db, "withdrawRequests", requestId), {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "Withdrawal rejected." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const renderListingsTab = () => (
    <div className="section-block">
      <h3>Pending Marketplace Listings</h3>
      {pendingListings.length === 0 ? (
        <div className="empty-state">No pending marketplace listings.</div>
      ) : (
        <div className="offers-grid">
          {pendingListings.map((item) => (
            <div key={item.id} className="offer-card">
              <div className="offer-meta">
                <span className="soft-badge">{item.type}</span>
                <span className="soft-badge">{item.category}</span>
                <span className="status-badge busy">Pending</span>
              </div>

              <h4>{item.title}</h4>
              <p>{item.description}</p>
              <p><strong>Seller:</strong> {item.sellerName}</p>
              <p><strong>Price:</strong> ₹{item.price}</p>
              <p><strong>Expiry:</strong> {item.expiry}</p>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={() => approveListing(item.id)}
                >
                  Approve
                </button>
                <button
                  className="danger-btn"
                  onClick={() => setRejectingListingId(item.id)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="section-block">
      <h3>Payment Verification Queue</h3>
      {paymentQueue.length === 0 ? (
        <div className="empty-state">No submitted payments right now.</div>
      ) : (
        <div className="offers-grid">
          {paymentQueue.map((order) => (
            <div key={order.id} className="offer-card">
              <div className="offer-meta">
                <span className="soft-badge">{order.sourceModel}</span>
                <span className="status-badge busy">{order.paymentStatus}</span>
              </div>

              <h4>{order.title}</h4>
              <p><strong>Buyer:</strong> {order.buyerName}</p>
              <p><strong>Seller:</strong> {order.sellerName}</p>
              <p><strong>Amount:</strong> ₹{order.amount}</p>
              <p><strong>Status:</strong> {order.orderStatus}</p>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={() => markOrderPaid(order)}
                >
                  Mark Paid & Reveal
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => rejectPayment(order.id)}
                >
                  Reject Payment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReportsTab = () => (
    <div className="section-block">
      <h3>Marketplace Reports</h3>
      {openReports.length === 0 ? (
        <div className="empty-state">No open marketplace reports.</div>
      ) : (
        <div className="offers-grid">
          {openReports.map((item) => (
            <div key={item.id} className="offer-card">
              <div className="offer-meta">
                <span className="soft-badge">{item.issueType}</span>
                <span className="status-badge expired">Open</span>
              </div>

              <h4>Order Report</h4>
              <p><strong>Buyer:</strong> {item.buyerName}</p>
              <p><strong>Seller:</strong> {item.sellerName}</p>
              <p><strong>Issue:</strong> {item.issueType}</p>
              <p><strong>Details:</strong> {item.details || "No details"}</p>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={() => resolveReport(item.id, item.orderId)}
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderWithdrawalsTab = () => (
    <div className="section-block">
      <h3>Withdrawal Requests</h3>
      {pendingWithdrawals.length === 0 ? (
        <div className="empty-state">No pending withdrawal requests.</div>
      ) : (
        <div className="offers-grid">
          {pendingWithdrawals.map((item) => (
            <div key={item.id} className="offer-card">
              <div className="offer-meta">
                <span className="soft-badge">Withdraw</span>
                <span className="status-badge busy">{item.status}</span>
              </div>

              <h4>{item.sellerName}</h4>
              <p><strong>Amount:</strong> ₹{item.amount}</p>
              <p><strong>UPI ID:</strong> {item.upiId}</p>
              <p><strong>Email:</strong> {item.sellerEmail}</p>
              <p><strong>Requested:</strong> {item.createdAt}</p>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  onClick={() => markWithdrawalPaid(item.id)}
                >
                  Mark Paid
                </button>
                <button
                  className="danger-btn"
                  onClick={() => rejectWithdrawal(item.id)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        <h2 className="section-title">Marketplace Admin Panel</h2>
        <p className="section-subtitle">
          Review listings, verify payments, manage reports, and process withdrawals.
        </p>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        <div className="stats-grid">
          <div className="panel">
            <div className="highlight-number">{pendingListings.length}</div>
            <p className="muted">Pending Listings</p>
          </div>
          <div className="panel">
            <div className="highlight-number">{paymentQueue.length}</div>
            <p className="muted">Payment Queue</p>
          </div>
          <div className="panel">
            <div className="highlight-number">{openReports.length}</div>
            <p className="muted">Open Reports</p>
          </div>
          <div className="panel">
            <div className="highlight-number">{pendingWithdrawals.length}</div>
            <p className="muted">Withdraw Requests</p>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: "18px", marginBottom: "18px" }}>
          <button
            className={activeTab === "listings" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("listings")}
          >
            Listings
          </button>
          <button
            className={activeTab === "payments" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("payments")}
          >
            Payments
          </button>
          <button
            className={activeTab === "reports" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>
          <button
            className={activeTab === "withdrawals" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("withdrawals")}
          >
            Withdrawals
          </button>
        </div>

        {activeTab === "listings" && renderListingsTab()}
        {activeTab === "payments" && renderPaymentsTab()}
        {activeTab === "reports" && renderReportsTab()}
        {activeTab === "withdrawals" && renderWithdrawalsTab()}

        {rejectingListingId && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Reject Marketplace Listing</h3>
              <textarea
                className="textarea"
                placeholder="Enter rejection reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="form-actions">
                <button className="danger-btn" onClick={rejectListing}>
                  Confirm Reject
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setRejectingListingId(null);
                    setRejectionReason("");
                  }}
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

export default AdminMarketplace;