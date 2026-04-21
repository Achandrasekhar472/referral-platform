import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  getDocs,
  where,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

function AdminReview({ goBack }) {
  const [offers, setOffers] = useState([]);
  const [reports, setReports] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);
  const [marketplaceReports, setMarketplaceReports] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);

  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [rejectingOfferId, setRejectingOfferId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [selectedReportUser, setSelectedReportUser] = useState(null);
  const [activeTab, setActiveTab] = useState("exchange-offers");
  const [rejectingSellId, setRejectingSellId] = useState(null);
  const [sellRejectionReason, setSellRejectionReason] = useState("");

  useEffect(() => {
    const unsubOffers = onSnapshot(
      query(collection(db, "offers"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const allOffers = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setOffers(allOffers);
        setLoading(false);
      }
    );

    const unsubReports = onSnapshot(
      query(collection(db, "reports"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const allReports = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setReports(allReports);
      }
    );

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const map = {};
      snapshot.docs.forEach((docItem) => {
        map[docItem.id] = docItem.data();
      });
      setUsersMap(map);
    });

    const unsubSellListings = onSnapshot(
      query(collection(db, "marketplaceListings"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const allListings = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setMarketplaceListings(allListings);
      }
    );

    const unsubPayments = onSnapshot(
      query(collection(db, "marketplaceOrders"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const allOrders = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setMarketplaceOrders(allOrders);
      }
    );

    const unsubMarketplaceReports = onSnapshot(
      query(collection(db, "marketplaceReports"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const allReports = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setMarketplaceReports(allReports);
      }
    );

    const unsubWithdrawals = onSnapshot(
      query(collection(db, "withdrawRequests"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const allWithdraws = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setWithdrawRequests(allWithdraws);
      }
    );

    return () => {
      unsubOffers();
      unsubReports();
      unsubUsers();
      unsubSellListings();
      unsubPayments();
      unsubMarketplaceReports();
      unsubWithdrawals();
    };
  }, []);

  const getListingStatus = (offer) => offer.listingStatus || "pending";

  const pendingOffers = offers.filter((offer) => getListingStatus(offer) === "pending");
  const openReports = reports.filter((report) => report.status === "open");

  const pendingSellListings = marketplaceListings.filter(
    (item) => item.listingStatus === "pending"
  );
  const paymentQueue = marketplaceOrders.filter(
    (item) => item.paymentStatus === "submitted"
  );
  const openMarketplaceReports = marketplaceReports.filter(
    (item) => item.status === "open"
  );
  const pendingWithdrawals = withdrawRequests.filter(
    (item) => item.status === "pending"
  );

  const getAccountStatus = (userId) => {
    const user = usersMap[userId];
    return user?.accountStatus || "active";
  };

  const getAccountStatusClass = (status) => {
    if (status === "blocked") return "expired";
    if (status === "suspended") return "busy";
    return "available";
  };

  const handleApprove = async (offerId) => {
    setNotice({ type: "", text: "" });

    try {
      await updateDoc(doc(db, "offers", offerId), {
        listingStatus: "approved",
        approvedAt: new Date().toISOString(),
        rejectionReason: "",
      });

      setNotice({ type: "success", text: "Exchange offer approved successfully." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const openRejectBox = (offerId) => {
    setRejectingOfferId(offerId);
    setRejectionReason("");
  };

  const cancelReject = () => {
    setRejectingOfferId(null);
    setRejectionReason("");
  };

  const handleReject = async () => {
    setNotice({ type: "", text: "" });

    if (!rejectingOfferId) return;

    if (!rejectionReason.trim()) {
      setNotice({ type: "error", text: "Please enter a rejection reason." });
      return;
    }

    try {
      await updateDoc(doc(db, "offers", rejectingOfferId), {
        listingStatus: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason.trim(),
      });

      setNotice({ type: "success", text: "Exchange offer rejected successfully." });
      cancelReject();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const markReportResolved = async (reportId) => {
    try {
      await updateDoc(doc(db, "reports", reportId), {
        status: "resolved",
        resolvedAt: new Date().toISOString(),
      });
      setNotice({ type: "success", text: "Exchange report marked as resolved." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const openSuspendBox = (report) => {
    setSelectedReportUser(report);
    setSuspensionReason("");
  };

  const suspendUser = async () => {
    if (!selectedReportUser) return;

    try {
      await updateDoc(doc(db, "users", selectedReportUser.reportedUserId), {
        accountStatus: "suspended",
        suspensionReason: suspensionReason.trim() || "Suspended by admin",
        suspendedAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "User suspended successfully." });
      setSelectedReportUser(null);
      setSuspensionReason("");
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const blockUser = async (report) => {
    try {
      await updateDoc(doc(db, "users", report.reportedUserId), {
        accountStatus: "blocked",
        suspensionReason: "Blocked by admin",
        blockedAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "User blocked successfully." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const activateUser = async (report) => {
    try {
      await updateDoc(doc(db, "users", report.reportedUserId), {
        accountStatus: "active",
        suspensionReason: "",
      });

      setNotice({ type: "success", text: "User restored to active status." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const deleteUserOffers = async (report) => {
    try {
      const offersQuery = query(
        collection(db, "offers"),
        where("ownerId", "==", report.reportedUserId)
      );
      const offersSnapshot = await getDocs(offersQuery);

      for (const offerDoc of offersSnapshot.docs) {
        await deleteDoc(doc(db, "offers", offerDoc.id));
      }

      setNotice({ type: "success", text: "All exchange offers by this user were deleted." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const approveSellListing = async (listingId) => {
    try {
      await updateDoc(doc(db, "marketplaceListings", listingId), {
        listingStatus: "approved",
        approvedAt: new Date().toISOString(),
        rejectionReason: "",
      });
      setNotice({ type: "success", text: "Sell listing approved." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const rejectSellListing = async () => {
    if (!rejectingSellId) return;
    if (!sellRejectionReason.trim()) {
      setNotice({ type: "error", text: "Please enter a rejection reason." });
      return;
    }

    try {
      await updateDoc(doc(db, "marketplaceListings", rejectingSellId), {
        listingStatus: "rejected",
        rejectionReason: sellRejectionReason.trim(),
        rejectedAt: new Date().toISOString(),
      });
      setRejectingSellId(null);
      setSellRejectionReason("");
      setNotice({ type: "success", text: "Sell listing rejected." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const markOrderPaid = async (order) => {
    try {
      let code = "";

      if (order.listingId) {
        const secretRef = doc(db, "listingSecrets", order.listingId);
        const secretSnap = await getDoc(secretRef);

        if (secretSnap.exists()) {
          code = secretSnap.data().code || "";
        }
      } else if (order.sourceModel === "C") {
        code = order.listingCode || "";
      }

      await updateDoc(doc(db, "marketplaceOrders", order.id), {
        paymentStatus: "paid",
        orderStatus: "revealed",
        revealed: true,
        revealedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        listingCode: code,
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
          updatedAt: new Date().toISOString(),
        });
      }

      setNotice({ type: "success", text: "Payment approved and code revealed." });
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

  const resolveMarketplaceReport = async (reportId, orderId) => {
    try {
      await updateDoc(doc(db, "marketplaceReports", reportId), {
        status: "resolved",
        resolvedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "marketplaceOrders", orderId), {
        reportStatus: "resolved",
        earningStatus: "available",
      });

      setNotice({ type: "success", text: "Buy/Sell report resolved." });
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

  const renderExchangeOfferCard = (offer, showActions = false) => {
    const listingStatus = getListingStatus(offer);

    return (
      <div key={offer.id} className="offer-card">
        <div className="offer-meta">
          <span className="soft-badge">Exchange</span>
          <span className="soft-badge">{offer.type}</span>
          <span className="soft-badge">{offer.category}</span>
          <span
            className={`status-badge ${
              listingStatus === "pending"
                ? "busy"
                : listingStatus === "rejected"
                ? "expired"
                : "available"
            }`}
          >
            {listingStatus === "pending"
              ? "Pending Review"
              : listingStatus === "rejected"
              ? "Rejected"
              : "Approved"}
          </span>
        </div>

        <h4>{offer.title}</h4>
        <p>{offer.description}</p>
        <p><strong>Owner:</strong> {offer.ownerName}</p>
        <p><strong>Email:</strong> {offer.ownerEmail}</p>
        <p><strong>Expiry:</strong> {offer.expiry}</p>

        {listingStatus === "rejected" && offer.rejectionReason && (
          <p className="expired-note">
            <strong>Reason:</strong> {offer.rejectionReason}
          </p>
        )}

        {showActions && (
          <div className="form-actions">
            <button className="primary-btn" onClick={() => handleApprove(offer.id)}>
              Approve
            </button>
            <button className="danger-btn" onClick={() => openRejectBox(offer.id)}>
              Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderExchangeReportCard = (report) => {
    const accountStatus = getAccountStatus(report.reportedUserId);

    return (
      <div key={report.id} className="offer-card">
        <div className="offer-meta">
          <span className="soft-badge">Exchange</span>
          <span className="soft-badge">{report.issueType}</span>
          <span className="status-badge expired">Open Report</span>
          <span className={`status-badge ${getAccountStatusClass(accountStatus)}`}>
            {accountStatus}
          </span>
        </div>

        <h4>{report.reportedUserName}</h4>
        <p><strong>Reported User Email:</strong> {report.reportedUserEmail}</p>
        <p><strong>Reported By:</strong> {report.reportedByName}</p>
        <p><strong>Reporter Email:</strong> {report.reportedByEmail}</p>
        <p><strong>Details:</strong> {report.details || "No extra details"}</p>

        <div className="form-actions">
          <button className="secondary-btn" onClick={() => openSuspendBox(report)}>
            Suspend Temporarily
          </button>
          <button className="danger-btn" onClick={() => blockUser(report)}>
            Block User
          </button>
          <button className="secondary-btn" onClick={() => activateUser(report)}>
            Restore Active
          </button>
          <button className="secondary-btn" onClick={() => deleteUserOffers(report)}>
            Delete User Offers
          </button>
          <button className="primary-btn" onClick={() => markReportResolved(report.id)}>
            Mark Resolved
          </button>
        </div>
      </div>
    );
  };

  const renderSellListingCard = (item) => (
    <div key={item.id} className="offer-card">
      <div className="offer-meta">
        <span className="soft-badge">Sell</span>
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
        <button className="primary-btn" onClick={() => approveSellListing(item.id)}>
          Approve
        </button>
        <button className="danger-btn" onClick={() => setRejectingSellId(item.id)}>
          Reject
        </button>
      </div>
    </div>
  );

  const renderPaymentCard = (order) => (
    <div key={order.id} className="offer-card">
      <div className="offer-meta">
        <span className="soft-badge">Buy/Sell</span>
        <span className="soft-badge">{order.sourceModel}</span>
        <span className="status-badge busy">{order.paymentStatus}</span>
      </div>

      <h4>{order.title}</h4>
      <p><strong>Buyer:</strong> {order.buyerName}</p>
      <p><strong>Seller:</strong> {order.sellerName}</p>
      <p><strong>Amount:</strong> ₹{order.amount}</p>
      <p><strong>Status:</strong> {order.orderStatus}</p>

      <div className="form-actions">
        <button className="primary-btn" onClick={() => markOrderPaid(order)}>
          Mark Paid & Reveal
        </button>
        <button className="secondary-btn" onClick={() => rejectPayment(order.id)}>
          Reject Payment
        </button>
      </div>
    </div>
  );

  const renderBuySellReportCard = (item) => (
    <div key={item.id} className="offer-card">
      <div className="offer-meta">
        <span className="soft-badge">Buy/Sell</span>
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
          onClick={() => resolveMarketplaceReport(item.id, item.orderId)}
        >
          Mark Resolved
        </button>
      </div>
    </div>
  );

  const renderWithdrawalCard = (item) => (
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
        <button className="primary-btn" onClick={() => markWithdrawalPaid(item.id)}>
          Mark Paid
        </button>
        <button className="danger-btn" onClick={() => rejectWithdrawal(item.id)}>
          Reject
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        <h2 className="section-title">Admin Panel</h2>
        <p className="section-subtitle">
          Review exchange offers, sell listings, reports, payments, withdrawals, and user moderation in one place.
        </p>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        <div className="stats-grid">
          <div className="panel">
            <div className="highlight-number">{pendingOffers.length}</div>
            <p className="muted">Exchange Pending</p>
          </div>
          <div className="panel">
            <div className="highlight-number">{pendingSellListings.length}</div>
            <p className="muted">Sell Pending</p>
          </div>
          <div className="panel">
            <div className="highlight-number">{paymentQueue.length}</div>
            <p className="muted">Payments</p>
          </div>
          <div className="panel">
            <div className="highlight-number">{openReports.length + openMarketplaceReports.length}</div>
            <p className="muted">Open Reports</p>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: "18px", marginBottom: "18px", flexWrap: "wrap" }}>
          <button
            className={activeTab === "exchange-offers" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("exchange-offers")}
          >
            Exchange Offers
          </button>
          <button
            className={activeTab === "exchange-reports" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("exchange-reports")}
          >
            Exchange Reports
          </button>
          <button
            className={activeTab === "sell-listings" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("sell-listings")}
          >
            Sell Listings
          </button>
          <button
            className={activeTab === "payments" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("payments")}
          >
            Payments
          </button>
          <button
            className={activeTab === "buysell-reports" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("buysell-reports")}
          >
            Buy/Sell Reports
          </button>
          <button
            className={activeTab === "withdrawals" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("withdrawals")}
          >
            Withdrawals
          </button>
        </div>

        {activeTab === "exchange-offers" && (
          <div className="section-block">
            <h3>Pending Exchange Offers</h3>
            {loading ? (
              <div className="empty-state">Loading offers...</div>
            ) : pendingOffers.length === 0 ? (
              <div className="empty-state">No pending exchange offers.</div>
            ) : (
              <div className="offers-grid">
                {pendingOffers.map((offer) => renderExchangeOfferCard(offer, true))}
              </div>
            )}
          </div>
        )}

        {activeTab === "exchange-reports" && (
          <div className="section-block">
            <h3>Open Exchange Reports</h3>
            {openReports.length === 0 ? (
              <div className="empty-state">No open exchange reports.</div>
            ) : (
              <div className="offers-grid">
                {openReports.map((report) => renderExchangeReportCard(report))}
              </div>
            )}
          </div>
        )}

        {activeTab === "sell-listings" && (
          <div className="section-block">
            <h3>Pending Sell Listings</h3>
            {pendingSellListings.length === 0 ? (
              <div className="empty-state">No pending sell listings.</div>
            ) : (
              <div className="offers-grid">
                {pendingSellListings.map((item) => renderSellListingCard(item))}
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="section-block">
            <h3>Payment Verification Queue</h3>
            {paymentQueue.length === 0 ? (
              <div className="empty-state">No submitted payments right now.</div>
            ) : (
              <div className="offers-grid">
                {paymentQueue.map((order) => renderPaymentCard(order))}
              </div>
            )}
          </div>
        )}

        {activeTab === "buysell-reports" && (
          <div className="section-block">
            <h3>Open Buy/Sell Reports</h3>
            {openMarketplaceReports.length === 0 ? (
              <div className="empty-state">No open buy/sell reports.</div>
            ) : (
              <div className="offers-grid">
                {openMarketplaceReports.map((item) => renderBuySellReportCard(item))}
              </div>
            )}
          </div>
        )}

        {activeTab === "withdrawals" && (
          <div className="section-block">
            <h3>Pending Withdrawal Requests</h3>
            {pendingWithdrawals.length === 0 ? (
              <div className="empty-state">No pending withdrawals.</div>
            ) : (
              <div className="offers-grid">
                {pendingWithdrawals.map((item) => renderWithdrawalCard(item))}
              </div>
            )}
          </div>
        )}

        {rejectingOfferId && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Reject Exchange Offer</h3>
              <textarea
                className="textarea"
                placeholder="Enter rejection reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="form-actions">
                <button className="danger-btn" onClick={handleReject}>
                  Confirm Reject
                </button>
                <button className="secondary-btn" onClick={cancelReject}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {rejectingSellId && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Reject Sell Listing</h3>
              <textarea
                className="textarea"
                placeholder="Enter rejection reason"
                value={sellRejectionReason}
                onChange={(e) => setSellRejectionReason(e.target.value)}
              />
              <div className="form-actions">
                <button className="danger-btn" onClick={rejectSellListing}>
                  Confirm Reject
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setRejectingSellId(null);
                    setSellRejectionReason("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedReportUser && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Suspend User Temporarily</h3>
              <p><strong>User:</strong> {selectedReportUser.reportedUserName}</p>

              <textarea
                className="textarea"
                placeholder="Enter suspension reason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
              />

              <div className="form-actions">
                <button className="danger-btn" onClick={suspendUser}>
                  Confirm Suspend
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setSelectedReportUser(null);
                    setSuspensionReason("");
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

export default AdminReview;