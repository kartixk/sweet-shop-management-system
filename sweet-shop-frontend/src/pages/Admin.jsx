import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Admin() {
  const [sweets, setSweets] = useState([]);
  const [newSweet, setNewSweet] = useState({ 
    name: "", 
    price: "", 
    category: "Milk", 
    quantity: "", 
    imageUrl: "" 
  });
  const [stockInputs, setStockInputs] = useState({}); 
  const [inventorySearch, setInventorySearch] = useState(""); 
  
  // --- REPORT STATE ---
  const [reportType, setReportType] = useState("day"); 
  const [reportSummary, setReportSummary] = useState({ totalAmount: 0, count: 0 });
  const [salesList, setSalesList] = useState([]); 
  const [reportLoading, setReportLoading] = useState(false);
  
  const navigate = useNavigate();

  const categories = [
    "Milk", "Classic Indian", "Laddu", "Halwa", "Barfi", "Traditional Indian", "Dry Fruits"
  ];

  const handleApiError = (err, defaultMsg) => {
    console.error(err);
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      toast.error("Session expired. Please login again.");
      setTimeout(() => navigate("/login"), 2000);
    } else {
      toast.error(defaultMsg || "An error occurred");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Access Denied: Please login first.");
      navigate("/login");
      return;
    }
    fetchSweets();
    fetchReport("day"); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSweets = async () => {
    try {
      const res = await api.get("/sweets");
      setSweets(res.data);
    } catch (err) {
      handleApiError(err, "Failed to fetch sweets");
    }
  };

  const fetchReport = async (type) => {
    setReportLoading(true);
    setReportType(type);

    try {
      const res = await api.get(`/reports/sales?type=${type}`);
      
      console.log(`ADMIN REPORT (${type}):`, res.data); 

      // Handle response whether it is an Object (likely) or Array
      const data = Array.isArray(res.data) ? (res.data[0] || {}) : res.data;

      setReportSummary({
          totalAmount: data.totalAmount || 0,
          count: data.count || 0
      });
      setSalesList(data.sales || []); 
      
    } catch (err) {
      handleApiError(err, "Failed to load reports");
      setSalesList([]);
      setReportSummary({ totalAmount: 0, count: 0 });
    } finally {
      setReportLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!salesList || salesList.length === 0) { 
      toast.warning("No data to download"); 
      return; 
    }
    
    const isDayView = reportType === 'day';
    const headers = isDayView
      ? ["Time", "Sweet Name", "Quantity", "Total Price"]
      : ["Date", "Time", "Sweet Name", "Quantity", "Total Price"];

    const rows = salesList.map(s => {
        const dateObj = new Date(s.createdAt || s.date); // Handle createdAt
        const dateStr = dateObj.toLocaleDateString();
        const timeStr = dateObj.toLocaleTimeString();
        
        // Handle Cart Item Structure
        const firstItem = s.items?.[0] || {};
        const sweetName = firstItem.sweetName || "Unknown";
        const quantity = firstItem.quantity || 0;
        
        const safeName = `"${sweetName.replace(/"/g, '""')}"`;
        
        return isDayView 
          ? [timeStr, safeName, quantity, s.orderTotal || s.totalPrice]
          : [dateStr, timeStr, safeName, quantity, s.orderTotal || s.totalPrice];
    });

    // Calculate totals
    const totalQuantity = salesList.reduce((sum, s) => sum + (s.items?.[0]?.quantity || 0), 0);
    const totalAmount = salesList.reduce((sum, s) => sum + (s.orderTotal || s.totalPrice || 0), 0);

    // Add summary rows
    const summaryRows = [
      [],
      isDayView 
        ? ["", "TOTAL", totalQuantity, totalAmount]
        : ["", "", "TOTAL", totalQuantity, totalAmount]
    ];

    const csvContent = [
      headers.join(","), 
      ...rows.map(r => r.join(",")),
      ...summaryRows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Sales_Report_${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel file downloaded successfully!");
  };

  /* STOCK HANDLERS */
  const handleStockInputChange = (id, value) => {
    setStockInputs({ ...stockInputs, [id]: Number(value) });
  };

  const adjustStock = (id, currentVal, amount) => {
    const baseVal = stockInputs[id] !== undefined ? stockInputs[id] : currentVal;
    const newVal = baseVal + amount;
    if (newVal >= 0) {
      setStockInputs({ ...stockInputs, [id]: newVal });
    } else {
      toast.warning("Stock cannot be negative");
    }
  };

  const saveStockUpdate = async (id) => {
    if (stockInputs[id] === undefined) {
      toast.info("No changes to save");
      return;
    }
    try {
      await api.put(`/sweets/${id}`, { quantity: stockInputs[id] });
      toast.success("Stock updated successfully!");
      fetchSweets();
      const newInputs = { ...stockInputs };
      delete newInputs[id];
      setStockInputs(newInputs);
    } catch (err) { 
      handleApiError(err, "Stock update failed"); 
    }
  };

  // --- ADD SWEET WITH AUTO-FORMATTING ---
  const handleAddSweet = async (e) => {
    e.preventDefault();

    // Format Name: "guLAB jaMUN" -> "Gulab Jamun"
    const formattedName = newSweet.name
      .trim()
      .toLowerCase()
      .split(/\s+/) 
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) 
      .join(' ');

    const sweetPayload = { ...newSweet, name: formattedName };

    try {
      await api.post("/sweets", sweetPayload);
      toast.success(`"${formattedName}" added successfully!`);
      setNewSweet({ name: "", price: "", category: "Milk", quantity: "", imageUrl: "" });
      fetchSweets(); 
    } catch (err) { 
      handleApiError(err, "Failed to add sweet"); 
    }
  };

  const handleDeleteSweet = async (id) => {
    if (window.confirm("Delete this sweet permanently?")) {
      try { 
        await api.delete(`/sweets/${id}`); 
        toast.success("Sweet deleted successfully!");
        fetchSweets(); 
      } 
      catch (err) { 
        handleApiError(err, "Delete failed"); 
      }
    }
  };

  const handleChange = (e) => setNewSweet({ ...newSweet, [e.target.name]: e.target.value });
  const isDayView = reportType === 'day';

  // --- FILTERED INVENTORY LIST (with alphabetical sorting) ---
  const filteredInventory = sweets
    .filter(s => s.name.toLowerCase().includes(inventorySearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <button onClick={() => navigate("/")} style={styles.backButton}>← Back to Shop</button>
      </div>

      {/* SALES REPORTS */}
      <div style={styles.reportCard}>
        <h2 style={styles.sectionTitle}>Sales & Earnings</h2>
        <div style={styles.statsContainer}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Total Revenue</div>
            <div style={styles.statValueGreen}>₹{reportSummary.totalAmount}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Total Orders</div>
            <div style={styles.statValueBlue}>{reportSummary.count}</div>
          </div>
        </div>

        <div style={styles.filterButtons}>
          {['day', 'week', 'month', 'year', 'all'].map(t => (
            <button key={t} onClick={() => fetchReport(t)} style={{...styles.filterButton, ...(reportType === t ? styles.filterButtonActive : {})}}>
              {t === 'day' ? "Today" : t === 'all' ? "All Time" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button onClick={downloadExcel} style={styles.downloadButton}>Download Excel</button>
        </div>

        <div style={styles.tableWrapper}>
          {reportLoading ? <div style={styles.loadingText}>Loading...</div> : (
            <table style={styles.table}>
              <thead style={styles.tableHead}>
                <tr>
                  {!isDayView && <th style={styles.tableHeader}>Date</th>}
                  <th style={styles.tableHeader}>Time</th>
                  <th style={styles.tableHeader}>Item</th>
                  <th style={styles.tableHeader}>Qty</th>
                  <th style={styles.tableHeader}>Item Total</th>
                </tr>
              </thead>
              
              <tbody>
                {salesList.length === 0 ? (
                  <tr><td colSpan={isDayView ? 4 : 5} style={styles.emptyCell}>No sales found.</td></tr>
                ) : (
                  // ✅ UPDATED BLOCK: Using flatMap to show every item individually
                  salesList.flatMap(s =>
                    s.items.map(item => {
                      const dateObj = new Date(s.createdAt || s.date);
                  
                      return (
                        <tr key={item._id} style={styles.tableRow}>
                          {!isDayView && <td style={styles.tableCell}>{dateObj.toLocaleDateString()}</td>}
                          <td style={{...styles.tableCell, color:'#666'}}>{dateObj.toLocaleTimeString()}</td>
                          <td style={{...styles.tableCell, fontWeight:'600'}}>{item.sweetName}</td>
                          <td style={styles.tableCell}>{item.quantity}</td>
                          <td style={{...styles.tableCell, color:'#28a745', fontWeight:'bold'}}>₹{item.totalPrice}</td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <hr style={styles.divider} />

      {/* ADD SWEET FORM */}
      <div style={styles.addSection}>
        <h3 style={styles.sectionSubtitle}>Add New Sweet</h3>
        <form onSubmit={handleAddSweet} style={styles.form}>
          <input 
            name="name" 
            placeholder="Sweet Name" 
            value={newSweet.name} 
            onChange={handleChange} 
            required 
            style={styles.input} 
          />
          
          <select 
            name="category" 
            value={newSweet.category} 
            onChange={handleChange} 
            required 
            style={styles.select}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <input 
            type="number" 
            name="price" 
            placeholder="Price (₹)" 
            value={newSweet.price} 
            onChange={handleChange} 
            required 
            style={styles.input} 
          />
          <input 
            type="number" 
            name="quantity" 
            placeholder="Initial Quantity" 
            value={newSweet.quantity} 
            onChange={handleChange} 
            required 
            style={styles.input} 
          />
          <input 
            name="imageUrl" 
            placeholder="Image URL (e.g., https://example.com/image.jpg)" 
            value={newSweet.imageUrl} 
            onChange={handleChange} 
            style={styles.inputFull} 
            required 
          />
          <button type="submit" style={styles.addButton}>Add Sweet</button>
        </form>
      </div>

      {/* INVENTORY (+/- Buttons) with SEARCH */}
      <div style={styles.inventoryHeader}>
        <h3 style={styles.sectionSubtitle}>Inventory Management</h3>
        <input
          type="text"
          placeholder=" Search inventory..."
          value={inventorySearch}
          onChange={(e) => setInventorySearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.inventoryCard}>
        {filteredInventory.length === 0 ? (
          <div style={{padding: '20px', textAlign: 'center', color: '#888'}}>No sweets match your search.</div>
        ) : (
          filteredInventory.map(s => (
            <div key={s._id} style={styles.inventoryItem}>
              <div style={styles.inventoryInfo}>
                <div style={styles.sweetName}>{s.name}</div>
                <div style={styles.sweetCategory}>({s.category})</div>
                <div style={s.quantity === 0 ? styles.outOfStock : styles.inStock}>
                  {s.quantity === 0 ? "Out of Stock" : `${s.quantity} left`}
                </div>
              </div>
              
              <div style={styles.inventoryControls}>
                <button onClick={() => adjustStock(s._id, s.quantity, -1)} style={styles.quantityButton}>-</button>
                <input 
                  type="number" 
                  value={stockInputs[s._id] !== undefined ? stockInputs[s._id] : s.quantity} 
                  onChange={(e) => handleStockInputChange(s._id, e.target.value)}
                  style={styles.quantityInput}
                />
                <button onClick={() => adjustStock(s._id, s.quantity, 1)} style={styles.quantityButton}>+</button>
                <button onClick={() => saveStockUpdate(s._id)} style={styles.updateButton}>Update</button>
                <button onClick={() => handleDeleteSweet(s._id)} style={styles.deleteButton}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Segoe UI', sans-serif", background: '#f5f7fa', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' },
  title: { fontSize: '2.5rem', fontWeight: '700', color: '#333', margin: 0 },
  backButton: { padding: '0.75rem 1.5rem', background: 'white', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer' },
  reportCard: { background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '2rem' },
  sectionTitle: { fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' },
  sectionSubtitle: { fontSize: '1.3rem', fontWeight: '600', marginBottom: '0', color: '#444' },
  statsContainer: { display: 'flex', gap: '2rem', marginBottom: '2rem' },
  statBox: { flex: 1, background: '#f8f9fa', padding: '1.5rem', borderRadius: '10px' },
  statLabel: { color: '#666', marginBottom: '0.5rem' },
  statValueGreen: { fontSize: '2rem', fontWeight: 'bold', color: '#28a745' },
  statValueBlue: { fontSize: '2rem', fontWeight: 'bold', color: '#007bff' },
  filterButtons: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap:'wrap' },
  filterButton: { padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer', background: '#e2e6ea' },
  filterButtonActive: { background: '#007bff', color: 'white' },
  downloadButton: { marginLeft: 'auto', padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  tableWrapper: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f8f9fa', position: 'sticky', top: 0 },
  tableHeader: { padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' },
  tableRow: { borderBottom: '1px solid #eee' },
  tableCell: { padding: '12px' },
  emptyCell: { padding: '20px', textAlign: 'center', color: '#888' },
  loadingText: { padding: '20px', textAlign: 'center', color: '#888' },
  divider: { margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' },
  addSection: { background: 'white', padding: '2rem', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '40px' },
  form: { display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '1rem' },
  select: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '1rem', background: 'white' },
  inputFull: { gridColumn: 'span 2', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '1rem' },
  addButton: { gridColumn: 'span 2', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  
  // Inventory Header Styles
  inventoryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  searchInput: { padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '1rem', width: '250px' },
  
  inventoryCard: { background: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1' },
  inventoryItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #eee' },
  inventoryInfo: { flex: 1 },
  sweetName: { fontSize: '1.1rem', fontWeight: 'bold' },
  sweetCategory: { color: '#666', fontSize: '0.9rem' },
  outOfStock: { color: 'red', fontWeight: 'bold' },
  inStock: { color: 'green', fontWeight: 'bold' },
  inventoryControls: { display: 'flex', alignItems: 'center', gap: '10px' },
  quantityButton: { width: '30px', height: '30px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold' },
  quantityInput: { width: '60px', textAlign: 'center', padding: '5px' },
  updateButton: { padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  deleteButton: { padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};