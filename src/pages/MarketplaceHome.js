import React from "react";

function MarketplaceHome({
  isLoggedIn,
  user,
  stats,
  goBack,
  goToExplore,
  goToSell,
  goToBuyRequests,
  goToOrders,
  goToWithdraw,
  goToAdminMarketplace,
}) {
  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        <h2 className="section-title">Marketplace</h2>
        <p className="section-subtitle">
          Separate from exchange. Buy listings, respond to needs, track orders, and manage earnings.
        </p>

        <div className="stats-grid">
          <div className="panel">
            <div className="highlight-number">{stats?.sales || 0}</div>
            <p className="muted">Sales</p>
          </div>
          <div className="panel">
            <div className="highlight-number">{stats?.purchases || 0}</div>
            <p className="muted">Purchases</p>
          </div>
          <div className="panel">
            <div className="highlight-number">₹{stats?.pendingEarnings || 0}</div>
            <p className="muted">Pending Earnings</p>
          </div>
          <div className="panel">
            <div className="highlight-number">₹{stats?.availableEarnings || 0}</div>
            <p className="muted">Available Earnings</p>
          </div>
        </div>

        <div className="section-block">
          <h3>Quick Actions</h3>
          <div className="form-actions">
            <button className="primary-btn" onClick={goToExplore}>
              Browse Listings
            </button>
            <button className="secondary-btn" onClick={goToSell}>
              Sell Listing
            </button>
            <button className="secondary-btn" onClick={goToBuyRequests}>
              Buy Requests
            </button>
            <button className="secondary-btn" onClick={goToOrders}>
              My Orders
            </button>
            <button className="secondary-btn" onClick={goToWithdraw}>
              Withdraw
            </button>
          </div>
        </div>

        <div className="section-block">
          <h3>Marketplace Models</h3>
          <div className="offers-grid">
            <div className="offer-card">
              <h4>Model A — Direct Sale</h4>
              <p>
                Seller posts a ready code. Buyer pays platform. Admin verifies payment.
                Code reveals immediately after approval.
              </p>
            </div>

            <div className="offer-card">
              <h4>Model C — Request Based</h4>
              <p>
                Buyer posts what they need. Seller responds with code and price.
                Buyer pays platform. Admin verifies. Code reveals.
              </p>
            </div>

            <div className="offer-card">
              <h4>Payout Logic</h4>
              <p>
                Earnings move from pending to available. Withdraw requests reserve balance
                so the same money cannot be requested twice.
              </p>
            </div>
          </div>
        </div>

        {isLoggedIn && user && (
          <div className="section-block">
            <h3>Account</h3>
            <div className="panel">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
            </div>
          </div>
        )}

        <div className="section-block">
          <h3>Admin Controls</h3>
          <div className="form-actions">
            <button className="secondary-btn" onClick={goToAdminMarketplace}>
              Marketplace Admin Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceHome;