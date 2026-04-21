import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

import AdminReview from "./pages/AdminReview";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import PostOffer from "./pages/PostOffer";
import Requests from "./pages/Requests";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";

import SellListing from "./pages/SellListing";
import BuyRequestsBoard from "./pages/BuyRequestsBoard";
import MarketplaceOrders from "./pages/MarketplaceOrders";
import MarketplaceWithdraw from "./pages/MarketplaceWithdraw";
import MySellListings from "./pages/MySellListings";

function App() {
  const [page, setPage] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const [offers, setOffers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [buyRequests, setBuyRequests] = useState([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);
  const [selectedMarketplaceOrderId, setSelectedMarketplaceOrderId] = useState(null);

  const adminEmails = ["achandras132@gmail.com"];
  const isAdmin = !!(user?.email && adminEmails.includes(user.email));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            if (
              userData.accountStatus === "suspended" ||
              userData.accountStatus === "blocked"
            ) {
              alert(
                userData.accountStatus === "blocked"
                  ? "Your account has been blocked by admin."
                  : `Your account has been suspended.${
                      userData.suspensionReason
                        ? " Reason: " + userData.suspensionReason
                        : ""
                    }`
              );

              await signOut(auth);
              setIsLoggedIn(false);
              setUser(null);
              setPage("home");
              return;
            }

            setIsLoggedIn(true);
            setUser(userData);
          } else {
            setIsLoggedIn(true);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.email?.split("@")[0] || "",
              accountStatus: "active",
            });
          }
        } catch (error) {
          console.error("Error loading user:", error);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribeOffers = onSnapshot(collection(db, "offers"), (snapshot) => {
      const offersData = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setOffers(offersData);
    });

    const unsubscribeRequests = onSnapshot(collection(db, "requests"), (snapshot) => {
      const requestsData = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setRequests(requestsData);
    });

    const unsubscribeSellListings = onSnapshot(
      collection(db, "marketplaceListings"),
      (snapshot) => {
        const data = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setMarketplaceListings(data);
      }
    );

    const unsubscribeBuyRequests = onSnapshot(collection(db, "buyRequests"), (snapshot) => {
      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setBuyRequests(data);
    });

    const unsubscribeOrders = onSnapshot(collection(db, "marketplaceOrders"), (snapshot) => {
      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setMarketplaceOrders(data);
    });

    return () => {
      unsubscribeOffers();
      unsubscribeRequests();
      unsubscribeSellListings();
      unsubscribeBuyRequests();
      unsubscribeOrders();
    };
  }, []);

  const requireLogin = (nextPage) => {
    if (!isLoggedIn) {
      alert("Please login first");
      setPage("login");
      return;
    }
    setPage(nextPage);
  };

  const handleLogin = () => setPage("home");
  const handleSignup = () => setPage("home");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedRequestId(null);
      setSelectedMarketplaceOrderId(null);
      setPage("home");
    } catch (error) {
      alert(error.message);
    }
  };

  const selectedRequest =
    requests.find((req) => req.id === selectedRequestId) || null;

  const selectedMarketplaceOrder =
    marketplaceOrders.find((order) => order.id === selectedMarketplaceOrderId) || null;

  const myMarketplaceStats = useMemo(() => {
    if (!user?.uid) {
      return {
        sales: 0,
        purchases: 0,
        pendingEarnings: 0,
        availableEarnings: 0,
      };
    }

    const mySales = marketplaceOrders.filter((o) => o.sellerId === user.uid);
    const myPurchases = marketplaceOrders.filter((o) => o.buyerId === user.uid);

    const pendingEarnings = mySales
      .filter((o) => o.earningStatus === "pending")
      .reduce((sum, o) => sum + Number(o.sellerAmount || 0), 0);

    const availableEarnings = mySales
      .filter((o) => o.earningStatus === "available")
      .reduce((sum, o) => sum + Number(o.sellerAmount || 0), 0);

    return {
      sales: mySales.length,
      purchases: myPurchases.length,
      pendingEarnings,
      availableEarnings,
    };
  }, [marketplaceOrders, user]);

  return (
    <div>
      {(page === "login" || page === "signup") && (
        <AuthPage
          onLogin={handleLogin}
          onSignup={handleSignup}
          goBack={() => setPage("home")}
        />
      )}

      {page === "home" && (
        <Home
          user={user || { name: "", email: "" }}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          goToLogin={() => setPage("login")}
          goToSignup={() => setPage("signup")}
          onLogout={handleLogout}
          goToExplore={() => setPage("explore")}
          goToPost={() => requireLogin("post")}
          goToSell={() => requireLogin("sell")}
          goToBuyRequests={() => requireLogin("buy-requests")}
          goToProfile={() => requireLogin("profile")}
          goToAdminReview={() => {
            if (!isLoggedIn) {
              alert("Please login first");
              setPage("login");
              return;
            }
            if (!isAdmin) {
              alert("Not authorized");
              return;
            }
            setPage("admin-review");
          }}
        />
      )}

      {page === "explore" && (
        <Explore
          offers={offers}
          setOffers={setOffers}
          setRequests={setRequests}
          marketplaceListings={marketplaceListings}
          isLoggedIn={isLoggedIn}
          currentUser={user}
          goToLogin={() => setPage("login")}
          goBack={() => setPage("home")}
          goToPost={() => requireLogin("post")}
          goToSell={() => requireLogin("sell")}
          goToBuyRequests={() => requireLogin("buy-requests")}
          onOpenOrder={(orderId) => {
            setSelectedMarketplaceOrderId(orderId);
            setPage("orders");
          }}
        />
      )}

      {page === "post" && user && (
        <PostOffer
          setOffers={setOffers}
          goToExplore={() => setPage("explore")}
          goBack={() => setPage("explore")}
          user={user}
        />
      )}

      {page === "requests" && user && (
        <Requests
          setRequests={setRequests}
          currentUser={user}
          goBack={() => setPage("home")}
          goToChat={(req) => {
            setSelectedRequestId(req.id);
            setPage("chat");
          }}
        />
      )}

      {page === "chat" && user && selectedRequest && (
        <Chat
          request={selectedRequest}
          goBack={() => setPage("requests")}
          currentUser={user}
        />
      )}

      {page === "sell" && user && (
        <SellListing
          user={user}
          goBack={() => setPage("explore")}
        />
      )}

      {page === "my-sell-listings" && user && (
        <MySellListings
          currentUser={user}
          goBack={() => setPage("profile")}
        />
      )}

      {page === "buy-requests" && (
        <BuyRequestsBoard
          currentUser={user}
          isLoggedIn={isLoggedIn}
          goBack={() => setPage("explore")}
          goToLogin={() => setPage("login")}
          onOpenOrder={(orderId) => {
            setSelectedMarketplaceOrderId(orderId);
            setPage("orders");
          }}
        />
      )}

      {page === "orders" && user && (
        <MarketplaceOrders
          currentUser={user}
          orders={marketplaceOrders}
          selectedOrder={selectedMarketplaceOrder}
          setSelectedOrderId={setSelectedMarketplaceOrderId}
          goBack={() => setPage("explore")}
        />
      )}

      {page === "withdraw" && user && (
        <MarketplaceWithdraw
          currentUser={user}
          orders={marketplaceOrders}
          goBack={() => setPage("profile")}
        />
      )}

      {page === "admin-review" && (
        isAdmin ? (
          <AdminReview goBack={() => setPage("home")} />
        ) : (
          <div className="app-page">
            <div className="container">
              <button
                className="secondary-btn back-btn"
                onClick={() => setPage("home")}
              >
                ⬅ Back
              </button>
              <div className="empty-state">Not authorized</div>
            </div>
          </div>
        )
      )}

      {page === "profile" && user && (
        <Profile
          offers={offers}
          requests={requests}
          goBack={() => setPage("home")}
          user={user}
          goToSell={() => requireLogin("sell")}
          goToBuyRequests={() => requireLogin("buy-requests")}
          goToOrders={() => requireLogin("orders")}
          goToWithdraw={() => requireLogin("withdraw")}
          goToPost={() => requireLogin("post")}
          goToRequests={() => requireLogin("requests")}
          goToExplore={() => setPage("explore")}
          goToMySellListings={() => requireLogin("my-sell-listings")}
          onAccountDeleted={() => {
            setIsLoggedIn(false);
            setUser(null);
            setOffers([]);
            setRequests([]);
            setSelectedRequestId(null);
            setSelectedMarketplaceOrderId(null);
            setPage("home");
          }}
        />
      )}
    </div>
  );
}

export default App;