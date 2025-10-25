import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Card, Badge } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userInterests, setUserInterests] = useState([]);
  const [username, setUsername] = useState(null);

  const fetchUserInterests = async (username) => {
    try {
      const response = await authAPI.getUserInterests(username);
      setUserInterests(response.data.interests || []);
    } catch (err) {
      console.log('Could not fetch user interests');
      setUserInterests([]);
    }
  };

  const checkLoginStatus = useCallback(() => {
    const storedUsername = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    
    if (storedUsername && token) {
      setUsername(storedUsername);
      fetchUserInterests(storedUsername);
    } else {
      setUsername(null);
      setUserInterests([]);
    }
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [location, checkLoginStatus]);

  const handleGetStarted = () => {
    if (username) {
      navigate('/analysis');
    } else {
      navigate('/login');
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <h1>Global Tourism Trend & Risk Analyzer</h1>
              <p className="lead">
                Analyze, Compare, and Explore Indian Tourism Smartly.
              </p>
              <Button 
                variant="light" 
                size="lg" 
                onClick={handleGetStarted}
                className="mt-3"
              >
                {username ? "Let's Start" : "Login to Start"}
              </Button>
            </Col>
          </Row>
        </Container>
      </section>

      {/* User Interests Section (only if logged in) */}
      {username && userInterests.length > 0 && (
        <section className="py-5 bg-light">
          <Container>
            <Row className="text-center mb-4">
              <Col>
                <h3>Your Interests</h3>
                <p className="text-muted">Based on your preferences</p>
              </Col>
            </Row>
            <Row className="justify-content-center">
              <Col md={8}>
                <Card>
                  <Card.Body className="text-center">
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                      {userInterests.map((interest, index) => (
                        <Badge key={index} bg="primary" className="fs-6 px-3 py-2">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        </section>
      )}

      {/* Highlights Section */}
      <section className="highlights-section">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="mb-3">Why Choose Our Platform?</h2>
              <p className="lead text-muted">
                Comprehensive analysis tools for smart tourism decisions
              </p>
            </Col>
          </Row>
          
          <Row className="g-4">
            <Col md={4}>
              <div className="highlight-card">
                <div className="icon">📊</div>
                <h4>Tourism Trends</h4>
                <p>
                  Analyze year-wise tourism data with interactive charts and 
                  identify peak seasons for your destinations.
                </p>
              </div>
            </Col>
            
            <Col md={4}>
              <div className="highlight-card">
                <div className="icon">⚠️</div>
                <h4>Risk Analysis</h4>
                <p>
                  Get comprehensive risk assessments including natural disasters, 
                  safety indices, and travel advisories.
                </p>
              </div>
            </Col>
            
            <Col md={4}>
              <div className="highlight-card">
                <div className="icon">🎯</div>
                <h4>Smart Recommendations</h4>
                <p>
                  Receive personalized destination recommendations based on your 
                  interests, preferences, and travel goals.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-5 bg-light">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="mb-3">Key Features</h2>
              <p className="lead text-muted">
                Everything you need for informed tourism decisions
              </p>
            </Col>
          </Row>
          
          <Row className="g-4">
            <Col md={6} lg={3}>
              <div className="text-center">
                <div className="fs-1 mb-3">🗺️</div>
                <h5>State & City Analysis</h5>
                <p className="text-muted">
                  Detailed insights for all Indian states and major cities
                </p>
              </div>
            </Col>
            
            <Col md={6} lg={3}>
              <div className="text-center">
                <div className="fs-1 mb-3">⚖️</div>
                <h5>Compare Destinations</h5>
                <p className="text-muted">
                  Side-by-side comparison of states and cities
                </p>
              </div>
            </Col>
            
            <Col md={6} lg={3}>
              <div className="text-center">
                <div className="fs-1 mb-3">🌤️</div>
                <h5>Weather Integration</h5>
                <p className="text-muted">
                  Real-time weather data and forecasts
                </p>
              </div>
            </Col>
            
            <Col md={6} lg={3}>
              <div className="text-center">
                <div className="fs-1 mb-3">📈</div>
                <h5>Data Visualization</h5>
                <p className="text-muted">
                  Interactive charts and graphs for better insights
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-5" style={{ background: 'linear-gradient(135deg, #004AAD 0%, #003d8a 100%)' }}>
        <Container>
          <Row className="text-center">
            <Col lg={8} className="mx-auto text-white">
              <h2 className="mb-3">Ready to Explore?</h2>
              <p className="lead mb-4">
                Start analyzing destinations and make informed travel decisions today.
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                {username ? (
                  <>
                    <Button 
                      variant="light" 
                      size="lg" 
                      onClick={() => navigate('/analysis')}
                    >
                      Start Analysis
                    </Button>
                    <Button 
                      variant="outline-light" 
                      size="lg" 
                      onClick={() => navigate('/compare')}
                    >
                      Compare Destinations
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="light" 
                      size="lg" 
                      onClick={() => navigate('/login')}
                    >
                      Login to Continue
                    </Button>
                    <Button 
                      variant="outline-light" 
                      size="lg" 
                      onClick={() => navigate('/register')}
                    >
                      Register Now
                    </Button>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;
