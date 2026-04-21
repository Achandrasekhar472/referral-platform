import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

function MySellListings({ currentUser, goBack }) {
  const [listings, setListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    description: "",
    expiry: "",
    price: "",
    originalValue: "",
  });
  const [notice, setNotice] = useState({ type: "", text: "" });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "marketplaceListings"), (snapshot) => {
      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setListings(data);
    });

    return () => unsubscribe();
  }, []);

  const myListings = useMemo(() => {
    return listings
      .filter((item) => item.sellerId === currentUser?.uid)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [listings, currentUser]);

  const getSellStatus = (item) => {
    if (item.sold === true) return "Sold";
    if (item.listingStatus === "pending") return "Pending Review";
    if (item.listingStatus === "rejected") return "Rejected";
    if (item.listingStatus === "approved" && item.isActive === false) return "Inactive";
    if (item.listingStatus === "approved") return "Approved";
    return "Unknown";
  };

  const getBadgeClass = (status) => {
    if (status === "Pending Review") return "busy";
    if (status === "Rejected") return "expired";
    if (status === "Sold") return "exchanged";
    if (status === "Inactive") return "busy";
    return "available";
  };

  const startEdit = (item) => {
    setNotice({ type: "", text: "" });

    if (item.listingStatus !== "pending") {
      setNotice({
        type: "error",
        text: "Only pending sell listings can be edited.",
      });
      return;
    }

    setEditingId(item.id);
    setEditForm({
      title: item.title || "",
      category: item.category || "",
      description: item.description || "",
      expiry: item.expiry || "",
      price: item.price || "",
      originalValue: item.originalValue || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      title: "",
      category: "",
      description: "",
      expiry: "",
      price: "",
      originalValue: "",
    });
  };

  const saveEdit = async (listingId) => {
    setNotice({ type: "", text: "" });

    if (
      !editForm.title ||
      !editForm.category ||
      !editForm.description ||
      !editForm.expiry ||
      !editForm.price
    ) {
      setNotice({ type: "error", text: "Please fill all required fields." });
      return;
    }

    try {
      await updateDoc(doc(db, "marketplaceListings", listingId), {
        title: editForm.title,
        category: editForm.category,
        description: editForm.description,
        expiry: editForm.expiry,
        price: Number(editForm.price),
        originalValue: editForm.originalValue ? Number(editForm.originalValue) : 0,
        updatedAt: new Date().toISOString(),
      });

      setNotice({ type: "success", text: "Sell listing updated successfully." });
      cancelEdit();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  const deleteListing = async (item) => {
    setNotice({ type: "", text: "" });

    if (item.sold === true) {
      setNotice({
        type: "error",
        text: "Sold listings cannot be deleted.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.title}"?`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "marketplaceListings", item.id));
      setNotice({ type: "success", text: "Sell listing deleted successfully." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };

  return (
    <div className="app-page">
      <div className="container">
        <button className="secondary-btn back-btn" onClick={goBack}>
          ⬅ Back
        </button>

        <h2 className="section-title">My Sell Listings</h2>
        <p className="section-subtitle">
          Track the offers you posted for sell, their approval status, and sold status.
        </p>

        {notice.text && (
          <div className={`notice-bar ${notice.type}`}>{notice.text}</div>
        )}

        {myListings.length === 0 ? (
          <div className="empty-state">You have not created any sell listings yet.</div>
        ) : (
          <div className="offers-grid">
            {myListings.map((item) => {
              const status = getSellStatus(item);

              return (
                <div key={item.id} className="offer-card">
                  {editingId === item.id ? (
                    <>
                      <input
                        className="input"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        placeholder="Title"
                        style={{ marginBottom: "10px" }}
                      />

                      <input
                        className="input"
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({ ...editForm, category: e.target.value })
                        }
                        placeholder="Category"
                        style={{ marginBottom: "10px" }}
                      />

                      <textarea
                        className="textarea"
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({ ...editForm, description: e.target.value })
                        }
                        placeholder="Description"
                        style={{ marginBottom: "10px" }}
                      />

                      <input
                        className="input"
                        type="date"
                        value={editForm.expiry}
                        onChange={(e) =>
                          setEditForm({ ...editForm, expiry: e.target.value })
                        }
                        style={{ marginBottom: "10px" }}
                      />

                      <input
                        className="input"
                        type="number"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: e.target.value })
                        }
                        placeholder="Price"
                        style={{ marginBottom: "10px" }}
                      />

                      <input
                        className="input"
                        type="number"
                        value={editForm.originalValue}
                        onChange={(e) =>
                          setEditForm({ ...editForm, originalValue: e.target.value })
                        }
                        placeholder="Original Value"
                        style={{ marginBottom: "10px" }}
                      />

                      <div className="form-actions">
                        <button className="primary-btn" onClick={() => saveEdit(item.id)}>
                          Save
                        </button>
                        <button className="secondary-btn" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="offer-meta">
                        <span className="soft-badge">Sell</span>
                        <span className="soft-badge">{item.type}</span>
                        <span className="soft-badge">{item.category}</span>
                        <span className={`status-badge ${getBadgeClass(status)}`}>
                          {status}
                        </span>
                      </div>

                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                      <p><strong>Price:</strong> ₹{item.price}</p>
                      {item.originalValue > 0 && (
                        <p><strong>Original Value:</strong> ₹{item.originalValue}</p>
                      )}
                      <p><strong>Expiry:</strong> {item.expiry}</p>

                      {status === "Pending Review" && (
                        <>
                          <p className="muted">
                            Your sell listing is under admin review.
                          </p>
                          <div className="form-actions">
                            <button className="primary-btn" onClick={() => startEdit(item)}>
                              Edit
                            </button>
                            <button className="danger-btn" onClick={() => deleteListing(item)}>
                              Delete
                            </button>
                          </div>
                        </>
                      )}

                      {status === "Approved" && (
                        <>
                          <p className="muted">
                            This sell listing is approved and visible to buyers.
                          </p>
                          <div className="form-actions">
                            <button className="danger-btn" onClick={() => deleteListing(item)}>
                              Delete
                            </button>
                          </div>
                        </>
                      )}

                      {status === "Rejected" && (
                        <>
                          <p className="expired-note">
                            This sell listing was rejected by admin.
                          </p>
                          {item.rejectionReason && (
                            <p className="muted">
                              <strong>Reason:</strong> {item.rejectionReason}
                            </p>
                          )}
                          <div className="form-actions">
                            <button className="danger-btn" onClick={() => deleteListing(item)}>
                              Delete
                            </button>
                          </div>
                        </>
                      )}

                      {status === "Sold" && (
                        <p className="muted">
                          This listing has already been sold.
                        </p>
                      )}

                      {status === "Inactive" && (
                        <p className="muted">
                          This listing is inactive.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MySellListings;