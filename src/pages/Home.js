import React from "react";

function Home({
  user,
  isLoggedIn,
  isAdmin,
  goToLogin,
  goToSignup,
  goToExplore,
  goToPost,
  goToSell,
  goToBuyRequests,
  goToProfile,
  onLogout,
  goToAdminReview,
}) {
  const featuredOffers = [
    { title: "Amazon Referral", desc: "Get discounts on first purchase" },
    { title: "Swiggy Coupon", desc: "Save on food delivery orders" },
    { title: "Uber Code", desc: "Discount for new riders" },
  ];

  const features = [
    {
      title: "Buy & Sell",
      desc: "Buy approved coupons, promo codes, referrals, and vouchers or sell your unused ones.",
    },
    {
      title: "Exchange Offers",
      desc: "Swap offers with other users through the exchange request system.",
    },
    {
      title: "Admin Review",
      desc: "Listings, reports, payments, and withdrawals stay under platform control.",
    },
    {
      title: "Smart Savings",
      desc: "Use, sell, or exchange offers instead of letting them go to waste.",
    },
  ];

  const steps = [
    "Browse offers",
    "Buy, sell, or exchange",
    "Admin verifies payment and reviews issues",
    "Track orders, requests, and earnings",
  ];

  return (
    <div className="home-shell">
      <nav className="home-navbar">
        <h1 className="home-logo">OfferX</h1>

        <div className="home-nav-links">
          <button className="home-navbar-btn" onClick={goToExplore}>
            Explore
          </button>
          <button className="home-navbar-btn" onClick={goToProfile}>
            Profile
          </button>

          {isAdmin && (
            <button className="home-navbar-btn" onClick={goToAdminReview}>
              Admin Panel
            </button>
          )}

          {!isLoggedIn ? (
            <>
              <button className="home-navbar-btn" onClick={goToLogin}>
                Login
              </button>
              <button className="home-primary-btn" onClick={goToSignup}>
                Sign Up
              </button>
            </>
          ) : (
            <button className="home-logout-btn" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-hero-badge">Safe • Useful • Community Driven</div>

        <h2 className="home-hero-title">Buy, Sell, or Exchange Offers</h2>

        <p className="home-hero-subtitle">
          Use OfferX to browse offers, exchange with other users, or buy and sell
          approved coupons, promo codes, vouchers, and referrals.
        </p>

        <p className="home-welcome-text">
          {isLoggedIn ? `Welcome, ${user?.name || ""}` : "Browse offers and get started"}
        </p>

        <div className="home-hero-buttons" style={{ flexWrap: "wrap" }}>
          <button className="home-primary-btn" onClick={goToExplore}>
            Browse Offers
          </button>
          <button className="home-secondary-btn" onClick={goToSell}>
            Sell
          </button>
          <button className="home-secondary-btn" onClick={goToPost}>
            Post Offer
          </button>
          <button className="home-secondary-btn" onClick={goToBuyRequests}>
            Post Requirement
          </button>
        </div>

        <div className="home-trust-row">
          <span>✔ Verified accounts</span>
          <span>✔ Exchange requests</span>
          <span>✔ Admin-verified payments</span>
        </div>
      </section>

      <section className="home-section">
        <h3 className="home-section-title">How It Works</h3>
        <div className="home-grid4">
          {steps.map((step, index) => (
            <div key={index} className="home-card">
              <div className="home-step-number">{index + 1}</div>
              <p className="home-card-text">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section-alt">
        <h3 className="home-section-title">Why Choose OfferX?</h3>
        <div className="home-grid4">
          {features.map((item, index) => (
            <div key={index} className="home-feature-card">
              <h4 className="home-card-title">{item.title}</h4>
              <p className="home-card-text">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h3 className="home-section-title">Trending Offers</h3>
        <div className="home-grid3">
          {featuredOffers.map((offer, index) => (
            <div key={index} className="home-offer-card">
              <h4 className="home-card-title">{offer.title}</h4>
              <p className="home-card-text">{offer.desc}</p>
              <button className="home-small-btn" onClick={goToExplore}>
                View More
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="home-stats-section">
        <div className="home-stat-box">
          <h3 className="home-stat-number">100+</h3>
          <p className="home-stat-label">Users</p>
        </div>
        <div className="home-stat-box">
          <h3 className="home-stat-number">250+</h3>
          <p className="home-stat-label">Offers Shared</p>
        </div>
        <div className="home-stat-box">
          <h3 className="home-stat-number">4.8★</h3>
          <p className="home-stat-label">Average Rating</p>
        </div>
      </section>

      <section className="home-section-alt">
        <h3 className="home-section-title">What Users Can Do</h3>
        <div className="offers-grid">
          <div className="offer-card">
            <h4>Sell</h4>
            <p>List your unused code and wait for admin approval before it goes live.</p>
          </div>

          <div className="offer-card">
            <h4>Post Requirement</h4>
            <p>Post what you need and sellers can respond with matching offers.</p>
          </div>

          <div className="offer-card">
            <h4>Post Offer</h4>
            <p>Create an exchange offer and swap it with other users through requests.</p>
          </div>
        </div>
      </section>

      <section className="home-cta-section">
        <h3 className="home-cta-title">Start Using OfferX Today</h3>
        <p className="home-cta-text">
          Browse offers, exchange smartly, or sell unused codes for real value.
        </p>
        <button className="home-primary-btn" onClick={goToExplore}>
          Open Explore
        </button>
      </section>

      <section className="home-section">
        <h3 className="home-section-title">About OfferX</h3>
        <div className="home-about-box">
          <p className="home-about-text">
            OfferX is a platform where users can buy, sell, and exchange referral
            codes, coupons, promo codes, and vouchers instead of letting them expire.
          </p>
          <p className="home-about-text">
            Our goal is to reduce waste, increase savings, and build a trusted
            place where users can connect and benefit from valuable offers.
          </p>
        </div>
      </section>

      <section className="home-contact-section">
        <h3 className="home-section-title">Contact Us</h3>
        <p className="home-contact-text">Email: support@offerx.com</p>
        <p className="home-contact-text">Phone: +91 98765 43210</p>
        <p className="home-contact-text">Location: India</p>
      </section>

      <footer className="home-footer">
        <p className="home-footer-text">© 2026 OfferX. All rights reserved.</p>
        <div className="home-footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Help</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;