import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [interests, setInterests] = useState([]);
  const [preferredMonth, setPreferredMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [interestOptions, setInterestOptions] = useState([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/interests`);
      if (response.data && response.data.status === 'success') {
        setInterestOptions(response.data.interests || []);
      } else {
        setInterestOptions([
          'Adventure', 'Backwaters', 'Beach', 'Border Town', 'Capital',
          'Commercial', 'Crafts Village', 'Cultural', 'Heritage', 'Hill Station',
          'Historical', 'Luxury', 'Mountain Pass', 'Mountain Village', 
          'Natural Landmark', 'Nature', 'Religious', 'Remote Valley',
          'Spiritual', 'Town', 'Tribal', 'Urban', 'Valley', 'Village', 'Wildlife'
        ]);
      }
    } catch (err) {
      console.error('Failed to load interests:', err);
      setInterestOptions([
        'Adventure', 'Backwaters', 'Beach', 'Border Town', 'Capital',
        'Commercial', 'Crafts Village', 'Cultural', 'Heritage', 'Hill Station',
        'Historical', 'Luxury', 'Mountain Pass', 'Mountain Village', 
        'Natural Landmark', 'Nature', 'Religious', 'Remote Valley',
        'Spiritual', 'Town', 'Tribal', 'Urban', 'Valley', 'Village', 'Wildlife'
      ]);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleInterestToggle = (interest) => {
    setInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      } else {
        return [...prev, interest];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        interests: interests,
        preferred_month: preferredMonth
      };

      const response = await axios.post(`${API_BASE_URL}/register`, userData);
      
      if (response.data.status === 'success') {
        localStorage.setItem('token', response.data.token || 'dummy-token');
        localStorage.setItem('username', formData.username);
        
        localStorage.setItem('currentUser', JSON.stringify({
          username: formData.username,
          email: formData.email,
          interests: interests,
          preferred_month: preferredMonth
        }));
        
        navigate('/');
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #004AAD 0%, #003d8a 100%)' }}>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            <Card className="shadow-lg">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary">Create Account</h2>
                  <p className="text-muted">Join us to get personalized recommendations</p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-4">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          placeholder="Choose a username"
                          required
                          disabled={loading}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          required
                          disabled={loading}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Create a password"
                          required
                          disabled={loading}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Confirm Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm your password"
                          required
                          disabled={loading}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">
                      Your Interests 
                      <small className="text-muted ms-2">({interests.length} selected)</small>
                    </Form.Label>
                    
                    <div className="border rounded p-3" style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
                      <div className="d-flex flex-wrap gap-2">
                        {interestOptions.map((interest, index) => (
                          <Badge
                            key={index}
                            bg={interests.includes(interest) ? 'primary' : 'secondary'}
                            className="fs-6 px-3 py-2"
                            style={{ 
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              userSelect: 'none'
                            }}
                            onClick={() => !loading && handleInterestToggle(interest)}
                          >
                            {interests.includes(interest) && '✓ '}
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Form.Text className="text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      Click on interests to select/deselect. These will be used for personalized recommendations.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">
                      Preferred Travel Month 
                      <small className="text-muted ms-2">(optional)</small>
                    </Form.Label>
                    <Form.Select
                      value={preferredMonth}
                      onChange={(e) => setPreferredMonth(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Any month</option>
                      {months.map((month, index) => (
                        <option key={index} value={month}>
                          {month}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      <i className="fas fa-calendar me-1"></i>
                      Select your preferred month for travel recommendations.
                    </Form.Text>
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </Form>

                <div className="text-center">
                  <p className="mb-0">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary fw-bold">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register;
