import { Link, useNavigate, useLocation } from "react-router-dom";

function getRole() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1])).role;
  // eslint-disable-next-line no-unused-vars
  } catch (e) {
    return null;
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // To check current page
  const role = getRole();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Helper to highlight active link
  const isActive = (path) => location.pathname === path;

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        
        {/* 1. BRAND LOGO */}
        <Link to="/" style={styles.logo}>
          <span style={styles.logoText}>SweetShop</span>
        </Link>

        {/* 2. CENTERED NAVIGATION LINKS */}
        <div style={styles.navLinks}>
          <Link 
            to="/" 
            style={isActive("/") ? styles.activeLink : styles.link}
          >
             Home
          </Link>
          
          {role === "USER" && (
            <Link 
              to="/cart" 
              style={isActive("/cart") ? styles.activeLink : styles.link}
            >
               Cart
            </Link>
          )}
          
          {role === "ADMIN" && (
            <Link 
              to="/admin" 
              style={isActive("/admin") ? styles.activeLink : styles.link}
            >
               Admin
            </Link>
          )}
        </div>

        {/* 3. AUTH SECTION */}
        <div style={styles.authSection}>
          {!role ? (
            <>
              <Link to="/login" style={styles.loginBtn}>Login</Link>
              <Link to="/register" style={styles.signupBtn}>Sign Up</Link>
            </>
          ) : (
            <button onClick={logout} style={styles.logoutBtn}>
              Logout
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}

/* --- STYLES --- */
const styles = {
  navbar: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '0.8rem 0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    marginBottom: '20px'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // LOGO STYLES
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer'
  },
  logoText: {
    color: 'white',
    fontWeight: '800',
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },

  // NAVIGATION LINKS GROUP
  navLinks: {
    display: 'flex',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.15)', // Glass container
    padding: '0.3rem 0.5rem',
    borderRadius: '50px', // Pill shape container
    backdropFilter: 'blur(5px)'
  },
  
  // Default Link Style
  link: {
    color: 'rgba(255, 255, 255, 0.8)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    padding: '0.5rem 1.2rem',
    borderRadius: '25px',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid transparent'
  },
  
  // Active Link Style (Bright White + Background)
  activeLink: {
    color: '#764ba2', // Purple text
    background: 'white', // White background
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '700',
    padding: '0.5rem 1.2rem',
    borderRadius: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transform: 'scale(1.05)',
    border: '1px solid white'
  },

  // AUTH BUTTONS
  authSection: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  loginBtn: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
    padding: '0.5rem 1rem',
    transition: 'opacity 0.2s',
  },
  signupBtn: {
    color: '#764ba2',
    background: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1.2rem',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.9rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s',
  },
  logoutBtn: {
    background: 'rgba(255, 59, 48, 0.9)',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1.2rem',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.9rem',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    transition: 'background 0.3s'
  }
};