import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

function MarketplaceWithdraw({ currentUser, orders, goBack }) {
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "withdrawRequests"), (snapshot) => {
      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setWithdrawRequests(data);
    });

    return () => unsubscribe();
  }, []);

  const mySales = useMemo(() => {
    return orders.filter((o) => o.sellerId === currentUser?.uid);
  }, [orders, currentUser]);

  const pendingEarnings = mySales
    .filter((o) => o.earningStatus === "pending")
    .reduce((sum, o) => sum + Number(o.sellerAmount || 0), 0);

  const totalAvailableEarnings = mySales
    .filter((o) => o.earningStatus === "available")
    .reduce((sum, o) => sum + Number(o.sellerAmount || 0), 0);

  const myPendingWithdrawRequests = withdrawRequests.filter(
    (w) => w.sellerId === currentUser?.uid && w.status === "pending"
  );

  const reservedWithdrawalAmount = myPendingWithdrawRequests.reduce(
    (sum, w) => sum + Number(w.amount || 0),
    0
  );

  const safeWithdrawableAmount = Math.max(
    totalAvailableEarnings - reservedWithdrawalAmount,
    0
  );

  const withdrawnTotal = withdrawRequests
    .filter((w) => w.sellerId === currentUser?.uid && w.status === "paid")
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const myWithdraws = withdrawRequests
    .filter((w) => w.sellerId === currentUser?.uid)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const submitWithdraw = async () => {
    setNotice({ type: "", text: "" });

    const numericAmount = Number(amount);

    if (!upiId.trim()) {
      setNotice({ type: "error", text: "Please enter your UPI ID." });
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setNotice({ type: "error", text: "Please enter a valid withdrawal amount." });
      return;
    }

    if (numericAmount > safeWithdrawableAmount) {
      setNotice({
        type: "error",
        text: "Withdrawal amount exceeds your currently withdrawable balance.",
      });
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "withdrawRequests"), {
        sellerId: currentUser.uid,
        sellerName: currentUser.name,
        sellerEmail: currentUser.email,
        amount: numericAmount,
        upiId: upiId.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setNotice({
        type: "success",
        text: "Withdrawal request submitted successfully.",
      });

      setAmount("");
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        <h2 className="section-title">Withdraw Earnings</h2>
        <p className="section-subtitle">
          Request payout for your safe withdrawable marketplace earnings.
        </p>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        <div className="profile-grid">
          <div className="stats-card">
            <h3>Earnings Summary</h3>
            <p>Pending Earnings: ₹{pendingEarnings}</p>
            <p>Total Available Earnings: ₹{totalAvailableEarnings}</p>
            <p>Reserved In Pending Withdrawals: ₹{reservedWithdrawalAmount}</p>
            <p><strong>Safe Withdrawable Balance: ₹{safeWithdrawableAmount}</strong></p>
            <p>Withdrawn Total: ₹{withdrawnTotal}</p>
          </div>

          <div className="form-card">
            <h3>New Withdrawal Request</h3>

            <input
              className="input"
              placeholder="Your UPI ID"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              style={{ marginBottom: "12px" }}
            />

            <input
              className="input"
              type="number"
              placeholder="Withdrawal amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ marginBottom: "12px" }}
            />

            <div className="form-header-note">
              You can only withdraw from the safe withdrawable balance.
            </div>

            <div className="form-actions">
              <button className="primary-btn" onClick={submitWithdraw} disabled={loading}>
                {loading ? "Submitting..." : "Request Withdrawal"}
              </button>
            </div>
          </div>
        </div>

        <div className="section-block">
          <h3>My Withdrawal Requests</h3>

          {myWithdraws.length === 0 ? (
            <div className="empty-state">No withdrawal requests yet.</div>
          ) : (
            <div className="offers-grid">
              {myWithdraws.map((item) => (
                <div key={item.id} className="offer-card">
                  <div className="offer-meta">
                    <span className="soft-badge">Withdrawal</span>
                    <span
                      className={`status-badge ${
                        item.status === "paid"
                          ? "available"
                          : item.status === "rejected"
                          ? "expired"
                          : "busy"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <h4>₹{item.amount}</h4>
                  <p><strong>UPI ID:</strong> {item.upiId}</p>
                  <p><strong>Requested:</strong> {item.createdAt}</p>
                  {item.paidAt && <p><strong>Paid At:</strong> {item.paidAt}</p>}
                  {item.rejectedAt && <p><strong>Rejected At:</strong> {item.rejectedAt}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarketplaceWithdraw;