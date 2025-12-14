import { useEffect, useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Safe User Role Extractor
function getUserRole() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    return payload.role;
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return null;
  }
}

function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 }); 
  const [loading, setLoading] = useState(true); 
  const navigate = useNavigate();

  const role = getUserRole();

  useEffect(() => {
    // 1. Auth Check
    if (!role) {
      toast.error("Please login to view cart", { position: "top-center" });
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    // 2. Admin Check
    if (role === "ADMIN") {
      toast.warning("Admins cannot place orders", { position: "top-center" });
      setTimeout(() => navigate("/"), 2000);
      return;
    }

    fetchCart();
    // eslint-disable-next-line
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await api.get("/cart");
      setCart(res.data || { items: [], total: 0 });
    } catch (err) {
      console.error(err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error("Failed to load cart.");
      }
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (sweetId, sweetName) => {
    const loadingToast = toast.loading("Removing item...");
    try {
      await api.delete(`/cart/items/${sweetId}`);
      toast.dismiss(loadingToast);
      toast.success(`${sweetName} removed from cart`);
      fetchCart();
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to remove item.");
    }
  };

  // --- NEW: Update Quantity ---
  const updateQuantity = async (sweetId, currentQty, change, maxStock) => {
    const newQty = currentQty + change;
    if (newQty < 1) {
        toast.warning("Quantity cannot be less than 1");
        return;
    }
    if (change > 0 && maxStock && newQty > maxStock) {
        toast.error(`Only ${maxStock} items available in stock!`);
        return;
    }

    try {
        await api.put(`/cart/items/${sweetId}`, { quantity: newQty });
        fetchCart(); 
    } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || "Failed to update quantity");
    }
  };

  // --- NEW: PDF Generator Helper ---
  const generatePDF = (currentCart) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("Sweet Shop - Order Invoice", 14, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Status: Paid / Confirmed`, 14, 36);

    // Table
    const tableColumn = ["Item Name", "Price (Rs)", "Qty", "Subtotal (Rs)"];
    const tableRows = [];

    currentCart.items.forEach(item => {
      tableRows.push([
        item.sweetName,
        item.price,
        item.selectedQuantity,
        item.price * item.selectedQuantity,
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
    });

    // Total
    const finalY = (doc.lastAutoTable?.finalY || 45) + 10;
    doc.setFontSize(14);
    doc.text(`Grand Total: Rs ${currentCart.total}`, 14, finalY);

    doc.save(`Invoice_${Date.now()}.pdf`);
  };

  const confirmOrder = async () => {
    if (!cart || cart.items.length === 0) {
      toast.warning("Your cart is empty!");
      return;
    }

    // Stock Validation
    const outOfStockItems = cart.items.filter(item =>
      (item.availableQuantity || 0) < item.selectedQuantity
    );

    if (outOfStockItems.length > 0) {
      const names = outOfStockItems.map(i => i.sweetName).join(', ');
      toast.error(`Insufficient stock for: ${names}`);
      return;
    }

    const loadingToast = toast.loading("Confirming your order...");

    try {
      await api.post("/cart/confirm");
      
      toast.dismiss(loadingToast);
      toast.success("Order confirmed successfully! Downloading Invoice... 🎉");

      // --- GENERATE PDF NOW (Before clearing state) ---
      generatePDF(cart);

      // Clear cart locally
      setCart({ items: [], total: 0 });

    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      const errorMsg = err.response?.data?.message || "Failed to confirm order";
      toast.error(errorMsg);
    }
  };

  // --- RENDER STATES ---

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.loader}></div>
      <p style={styles.loadingText}>Loading your cart...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div style={styles.header}>
        <h2 style={styles.title}>Shopping Cart</h2>
        <button onClick={() => navigate("/")} style={styles.backButton}>
          ← Continue Shopping
        </button>
      </div>

      {(!cart || cart.items.length === 0) ? (
        <div style={styles.emptyCart}>
          <div style={styles.emptyIcon}>🛒</div>
          <h3 style={styles.emptyTitle}>Your cart is empty</h3>
          <p style={styles.emptyText}>Add some delicious sweets to get started!</p>
          <button onClick={() => navigate("/")} style={styles.shopButton}>
            Browse Sweets
          </button>
        </div>
      ) : (
        <div style={styles.contentWrapper}>
          {/* LEFT SIDE: ITEMS */}
          <div style={styles.itemsSection}>
            {cart.items.map((item) => (
              <div key={item.sweet || item._id} style={styles.cartItem}>
                <div style={styles.itemInfo}>
                  <h3 style={styles.itemName}>{item.sweetName}</h3>
                  <div style={styles.itemDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Price:</span>
                      <span style={styles.detailValue}>₹{item.price}</span>
                    </div>

                    {/* --- QUANTITY BUTTONS (Added Here) --- */}
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Quantity:</span>
                      <div style={styles.qtyContainer}>
                        <button 
                            style={styles.qtyBtn} 
                            onClick={() => updateQuantity(item.sweet, item.selectedQuantity, -1, item.availableQuantity)}
                        >-</button>
                        <span style={styles.qtyValue}>{item.selectedQuantity}</span>
                        <button 
                            style={styles.qtyBtn} 
                            onClick={() => updateQuantity(item.sweet, item.selectedQuantity, 1, item.availableQuantity)}
                        >+</button>
                      </div>
                    </div>
                    {/* ------------------------------------- */}

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Available:</span>
                      <span style={{
                        ...styles.detailValue,
                        color: (item.availableQuantity || 0) > 0 ? '#28a745' : '#dc3545'
                      }}>
                        {item.availableQuantity || 0}
                      </span>
                    </div>
                  </div>

                  {(item.availableQuantity || 0) < item.selectedQuantity && (
                    <div style={styles.stockWarning}>
                      Only {item.availableQuantity || 0} units available
                    </div>
                  )}

                  <div style={styles.itemTotal}>
                    Subtotal: <span style={styles.itemTotalAmount}>₹{item.price * item.selectedQuantity}</span>
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.sweet, item.sweetName)}
                  style={styles.removeButton}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* RIGHT SIDE: SUMMARY (Sticky) */}
          <div style={styles.summaryWrapper}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Order Summary</h3>

              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Items ({cart.items.length}):</span>
                <span style={styles.summaryValue}>₹{cart.total}</span>
              </div>

              <div style={styles.summaryDivider}></div>

              <div style={styles.summaryTotal}>
                <span style={styles.totalLabel}>Total:</span>
                <span style={styles.totalValue}>₹{cart.total}</span>
              </div>

              <button onClick={confirmOrder} style={styles.confirmButton}>
                Confirm Order & Download Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;

// --- STYLES (EXACT ORIGINAL + Small Qty additions) ---
const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: '#f5f7fa',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    color: '#555',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh'
  },
  loader: {
    width: '50px',
    height: '50px',
    border: '5px solid #e9ecef',
    borderTop: '5px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#666'
  },
  emptyCart: {
    background: 'white',
    borderRadius: '12px',
    padding: '4rem 2rem',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
  },
  emptyIcon: { fontSize: '5rem', marginBottom: '1rem' },
  emptyTitle: { fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' },
  emptyText: { color: '#666', marginBottom: '2rem' },
  shopButton: {
    padding: '1rem 2.5rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    cursor: 'pointer'
  },
  contentWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2rem',
    alignItems: 'start'
  },
  itemsSection: {
    flex: '2', 
    minWidth: '300px', 
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  summaryWrapper: {
    flex: '1', 
    minWidth: '300px',
    position: 'sticky',
    top: '20px'
  },
  cartItem: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap' 
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: '1.25rem', fontWeight: '700', margin: '0 0 0.5rem 0' },
  itemDetails: { marginBottom: '1rem' },
  detailRow: { display: 'flex', gap: '10px', alignItems:'center', fontSize: '0.95rem', color: '#555', marginBottom: '4px' },
  detailLabel: { minWidth: '70px' }, // Keep alignment
  detailValue: { fontWeight: '600', color: '#333' },
  
  // --- Small additions for the buttons only ---
  qtyContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
  qtyBtn: { 
    width: '28px', height: '28px', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    background: '#edf2f7', border: '1px solid #cbd5e0', 
    borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' 
  },
  qtyValue: { fontWeight: 'bold', minWidth: '20px', textAlign: 'center' },
  // ---------------------------------------------

  stockWarning: {
    background: '#fff3cd', color: '#856404', padding: '5px 10px',
    borderRadius: '5px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '10px',
    display: 'inline-block'
  },
  itemTotal: { borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '5px', fontWeight: '600' },
  itemTotalAmount: { color: '#667eea', fontSize: '1.1rem', marginLeft: '5px' },
  removeButton: {
    padding: '8px 16px',
    background: '#ff4d4f',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  summaryCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
  },
  summaryTitle: { fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', margin: 0 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
  summaryDivider: { height: '1px', background: '#eee', margin: '1.5rem 0' },
  summaryTotal: { display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '1.2rem', fontWeight: 'bold' },
  totalValue: { color: '#667eea', fontSize: '1.5rem' },
  confirmButton: {
    width: '100%',
    padding: '1rem',
    background: 'linear-gradient(to right, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  }
};