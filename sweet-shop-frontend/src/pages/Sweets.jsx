import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// --- NEW IMPORTS FOR PDF ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Safe User Role Extractor
function getUserRole() {
  const token = localStorage.getItem("token");
  const directRole = localStorage.getItem("role");

  if (directRole) return directRole.toLowerCase(); 
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role) return payload.role.toLowerCase();
    if (payload.isAdmin) return "admin";
    return "user";
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return null;
  }
}

export default function Sweets() {
  const [sweets, setSweets] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const navigate = useNavigate();
  
  const role = getUserRole(); 

  useEffect(() => {
    // Hide number input spinners
    const style = document.createElement('style');
    style.innerHTML = `
      input[type="number"]::-webkit-inner-spin-button,
      input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type="number"] {
        -moz-appearance: textfield;
      }
    `;
    document.head.appendChild(style);
    // eslint-disable-next-line react-hooks/immutability
    fetchSweets();
    return () => { document.head.removeChild(style); };
  }, []);

  const fetchSweets = async () => {
    try {
      const res = await api.get("/sweets");
      // Sort Sweets Alphabetically (A-Z)
      const sortedSweets = res.data.sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setSweets(sortedSweets);
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      console.error("Failed to fetch sweets");
      toast.error(" Failed to load sweets.");
    }
  };

  /* --- QUANTITY HANDLERS --- */
  const increaseQty = (sweetId, maxStock) => {
    const currentQty = quantities[sweetId] || 1;
    if (currentQty < maxStock) {
      setQuantities({ ...quantities, [sweetId]: currentQty + 1 });
    } else {
      toast.warning(` Max quantity is ${maxStock}`);
    }
  };

  const decreaseQty = (sweetId) => {
    const currentQty = quantities[sweetId] || 1;
    if (currentQty > 1) {
      setQuantities({ ...quantities, [sweetId]: currentQty - 1 });
    }
  };

  const handleQuantityChange = (sweetId, value, maxStock) => {
    const numValue = parseInt(value) || 1;
    if (numValue >= 1 && numValue <= maxStock) {
      setQuantities({ ...quantities, [sweetId]: numValue });
    } else if (numValue > maxStock) {
      setQuantities({ ...quantities, [sweetId]: maxStock });
    }
  };

  /* --- NEW: PDF GENERATOR FUNCTION --- */
  const generateSingleInvoice = (sweet, quantity) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Sweet Shop - Order Invoice", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Status: Paid (Instant Buy)`, 14, 36);

    const total = sweet.price * quantity;
    const tableColumn = ["Item Name", "Price (Rs)", "Qty", "Subtotal (Rs)"];
    const tableRows = [[
        sweet.name,
        sweet.price,
        quantity,
        total
    ]];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
    });

    const finalY = (doc.lastAutoTable?.finalY || 45) + 10;
    doc.setFontSize(14);
    doc.text(`Grand Total: Rs ${total}`, 14, finalY);

    doc.save(`Invoice_${sweet.name}_${Date.now()}.pdf`);
  };

  /* --- ACTION 1: ADD TO CART --- */
  const handleAddToCart = async (sweet) => {
    if (!role) {
      toast.warning(" Please login first");
      setTimeout(() => navigate("/login"), 1500);
      return;
    }
    
    const qtyToAdd = quantities[sweet._id] || 1;
    const loadingToast = toast.loading("⏳ Adding to cart...");

    try {
      await api.post("/cart/items", {
        sweetId: sweet._id,
        quantity: qtyToAdd,
      });
      
      toast.update(loadingToast, {
        render: ` Added ${qtyToAdd} ${sweet.name} to cart!`,
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      // Reset quantity input
      const newQuantities = { ...quantities };
      delete newQuantities[sweet._id];
      setQuantities(newQuantities);

    } catch (err) {
      handleError(err, loadingToast);
    }
  };

  /* --- ACTION 2: DIRECT PURCHASE --- */
  const handleFastBuy = async (sweet) => {
    if (!role) {
      toast.warning(" Please login first");
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    const qtyToBuy = quantities[sweet._id] || 1;
    const loadingToast = toast.loading("⚡ Processing purchase...");

    try {
      //  FIX APPLIED HERE: Using /cart/buy-now
      await api.post("/cart/buy-now", {
        sweetId: sweet._id,
        quantity: qtyToBuy
      });

      toast.update(loadingToast, {
        render: "Order placed successfully! Downloading Invoice... 🎉",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      // --- GENERATE PDF HERE ---
      generateSingleInvoice(sweet, qtyToBuy);
      // ------------------------

      fetchSweets(); // Refresh stock
      
      const newQuantities = { ...quantities };
      delete newQuantities[sweet._id];
      setQuantities(newQuantities);

    } catch (err) {
      //  Error Handling for Buy Now
      console.error(err);
      const errorMsg = err.response?.data?.message || "Buy now failed";
      
      toast.update(loadingToast, {
        render: ` ${errorMsg}`,
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
    }
  };

  /* --- SHARED ERROR HANDLER --- */
  const handleError = (err, toastId) => {
    console.error(err);
    const errorMsg = err.response?.data?.message || "Action failed";
    
    if (err.response?.status === 401 || err.response?.status === 403) {
      toast.update(toastId, {
        render: " Session expired. Login required.",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
      setTimeout(() => navigate("/login"), 1500);
    } else {
      toast.update(toastId, {
        render: ` ${errorMsg}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      if (errorMsg.toLowerCase().includes("stock")) fetchSweets();
    }
  };

  // --- CLEAN CATEGORY HELPER ---
  const getCleanCategory = (category) => {
    if (!category) return "";
    return category
      .toUpperCase()
      .replace(/\s*SWEETS?\s*/g, "") 
      .trim();
  };

  // --- FILTER LOGIC ---
  const uniqueCategories = [...new Set(sweets.map(s => getCleanCategory(s.category)))];
  uniqueCategories.sort(); 
  const categories = ["ALL", ...uniqueCategories];

  const filteredSweets = sweets.filter(sweet => {
    const matchesSearch = sweet.name.toLowerCase().includes(searchTerm.toLowerCase());
    const currentCategory = getCleanCategory(sweet.category);
    const matchesCategory = selectedCategory === "ALL" || currentCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={styles.container}>
      {/* ToastContainer placed here for specific page notifications */}
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      {/* Search and Filter */}
      <div style={styles.filterSection}>
        <div style={styles.searchWrapper}>
          <svg style={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search for sweets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.categoryFilter}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...styles.categoryButton,
                ...(selectedCategory === cat ? styles.categoryButtonActive : {})
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sweets Grid */}
      <div style={styles.grid}>
        {filteredSweets.map((sweet) => (
          <div key={sweet._id} style={styles.card}>
            <div style={styles.imageWrapper}>
              <img 
                src={sweet.imageUrl || "https://placehold.co/300x200?text=No+Image"} 
                alt={sweet.name} 
                style={styles.image} 
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = "https://placehold.co/300x200?text=Image+Not+Found";
                }}
              />
              
              {sweet.quantity === 0 && (
                <div style={styles.outOfStockBadge}>Out of Stock</div>
              )}
            </div>
            
            <div style={styles.cardContent}>
              <div style={styles.headerSection}>
                <div>
                  <h3 style={styles.sweetName}>{sweet.name}</h3>
                  <p style={styles.category}>{getCleanCategory(sweet.category)}</p>
                </div>
                <div style={styles.unitBadge}>250g</div>
              </div>
              
              <div style={styles.priceRow}>
                <span style={styles.price}>₹{sweet.price}</span>
                <div style={sweet.quantity > 0 ? styles.stockBadge : styles.stockBadgeOut}>
                  {sweet.quantity > 0 ? `${sweet.quantity} units left` : "Sold Out"}
                </div>
              </div>

              {role !== "admin" && (
                <div style={styles.actionSection}>
                  {!role ? (
                    <button onClick={() => navigate("/login")} style={styles.loginButton}>
                      Login to Order
                    </button>
                  ) : (
                    <>
                      {sweet.quantity > 0 ? (
                        <div style={styles.purchaseSection}>
                          <div style={styles.quantityControl}>
                            <button onClick={() => decreaseQty(sweet._id)} style={styles.qtyButton}>-</button>
                            <input
                              type="number"
                              value={quantities[sweet._id] || 1}
                              onChange={(e) => handleQuantityChange(sweet._id, e.target.value, sweet.quantity)}
                              style={styles.qtyInput}
                            />
                            <button onClick={() => increaseQty(sweet._id, sweet.quantity)} style={styles.qtyButton}>+</button>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              onClick={() => handleAddToCart(sweet)} 
                              style={styles.addButton}
                            >
                               Add to Cart
                            </button>
                            
                            <button 
                              onClick={() => handleFastBuy(sweet)} 
                              style={styles.buyButton}
                            >
                               Buy Now
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button style={styles.disabledButton} disabled>
                           Unavailable
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', background: '#f5f7fa', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" },
  filterSection: { background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' },
  searchWrapper: { position: 'relative', width: '100%', marginBottom: '1rem' },
  searchIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#667eea', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '1rem 1rem 1rem 3rem', border: '2px solid #e9ecef', borderRadius: '12px', fontSize: '1rem', outline: 'none', transition: 'border 0.3s', boxSizing: 'border-box' },
  categoryFilter: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  categoryButton: { padding: '0.6rem 1.25rem', border: '2px solid #e9ecef', borderRadius: '8px', background: 'white', fontWeight: '600', cursor: 'pointer' },
  categoryButtonActive: { background: '#667eea', color: 'white', borderColor: '#667eea' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' },
  card: { background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' },
  imageWrapper: { position: 'relative', height: '200px', background: '#f0f0f0' },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  outOfStockBadge: { position: 'absolute', top: '1rem', right: '1rem', background: '#dc3545', color: 'white', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem' },
  cardContent: { padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' },
  headerSection: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' },
  sweetName: { fontSize: '1.25rem', fontWeight: '700', margin: 0 },
  category: { fontSize: '0.85rem', color: '#667eea', fontWeight: '600', textTransform: 'uppercase' },
  unitBadge: { background: '#667eea', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.8rem', height: 'fit-content' },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' },
  price: { fontSize: '1.5rem', fontWeight: '700', color: '#4a5568' },
  stockBadge: { fontSize: '0.8rem', color: '#059669', background: '#d1fae5', padding: '0.3rem 0.8rem', borderRadius: '12px', fontWeight: '700' },
  stockBadgeOut: { fontSize: '0.8rem', color: '#dc2626', background: '#fee2e2', padding: '0.3rem 0.8rem', borderRadius: '12px', fontWeight: '700' },
  actionSection: { marginTop: 'auto' },
  purchaseSection: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  quantityControl: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f7fafc', padding: '0.5rem', borderRadius: '8px' },
  qtyButton: { width: '30px', height: '30px', border: '1px solid #cbd5e0', background: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  qtyInput: { width: '50px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 'bold', fontSize: '1.1rem' },
  addButton: { flex: 1, padding: '0.8rem', background: 'white', color: '#667eea', border: '2px solid #667eea', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
  buyButton: { flex: 1, padding: '0.8rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)' },
  loginButton: { width: '100%', padding: '0.8rem', background: '#718096', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  disabledButton: { width: '100%', padding: '0.8rem', background: '#e2e8f0', color: '#a0aec0', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'not-allowed' }
};