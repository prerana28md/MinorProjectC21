import React, { useState, useEffect } from 'react';
import { Navbar as BSNavbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [username, setUsername] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check login status on mount and when location changes
  useEffect(() => {
    checkLoginStatus();
  }, [location]);

  const checkLoginStatus = () => {
    const storedUsername = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    
    if (storedUsername && token) {
      setUsername(storedUsername);
      setIsLoggedIn(true);
    } else {
      setUsername(null);
      setIsLoggedIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('currentUser');
    setUsername(null);
    setIsLoggedIn(false);
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <BSNavbar expand="lg" className="navbar">
      <Container>
        <BSNavbar.Brand as={Link} to="/" className="navbar-brand">
          Tourism Analyzer
        </BSNavbar.Brand>
        
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            
            
            {/* Only show these links when user is logged in */}
            {isLoggedIn && (
              <>
                <Nav.Link as={Link} to="/" className={isActive('/') ? 'active' : ''}>
              Home
            </Nav.Link>
                <Nav.Link as={Link} to="/analysis" className={isActive('/analysis') ? 'active' : ''}>
                  Analysis
                </Nav.Link>
                <Nav.Link as={Link} to="/compare" className={isActive('/compare') ? 'active' : ''}>
                  Compare
                </Nav.Link>
                <Nav.Link as={Link} to="/recommendation" className={isActive('/recommendation') ? 'active' : ''}>
                  Recommendation
                </Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav>
            {isLoggedIn ? (
              <Dropdown>
                <Dropdown.Toggle variant="outline-light" id="dropdown-basic">
                  👤 {username}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleLogout}>
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-outline-light">
                  Login
                </Link>
                <Link to="/register" className="btn btn-light">
                  Register
                </Link>
              </div>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
