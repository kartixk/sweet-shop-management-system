import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Don't forget this import!

import Sweets from "./pages/Sweets";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/cart"; // Note: case sensitive, check if your file is Cart.jsx or cart.jsx
import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";

function App() {
  return (
    <BrowserRouter>
      {/* ToastContainer lives here to survive page changes */}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      
      <Navbar />
      <Routes>
        <Route path="/" element={<Sweets />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;