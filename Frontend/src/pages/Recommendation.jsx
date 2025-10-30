import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import axios from 'axios';
import WeatherCard from '../components/WeatherCard';

const API_BASE_URL = 'http://127.0.0.1:5000';

const Recommendation = () => {
  const [interests, setInterests] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState({});
  const [userPreferences, setUserPreferences] = useState(null);
  const autoLoadDoneRef = useRef(false);
  const weatherSectionRef = useRef(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const loadUserPreferences = useCallback(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUserPreferences(user);

        if (user.interests && Array.isArray(user.interests) && user.interests.length > 0) {
          setSelectedInterests(user.interests);
          if (user.preferred_month) setSelectedMonth(user.preferred_month);
        }
      } catch (err) {
        console.error('Error loading user preferences:', err);
      }
    }
  }, []);

  useEffect(() => {
    fetchInterests();
  }, []);

  useEffect(() => {
    loadUserPreferences();
  }, [loadUserPreferences]);

  useEffect(() => {
    if (userPreferences?.interests && interests.length > 0) {
      const shouldSet = selectedInterests.length === 0;
      if (shouldSet) {
        setSelectedInterests(userPreferences.interests);
        if (!autoLoadDoneRef.current) {
          autoFetchRecommendations(userPreferences.interests, userPreferences.preferred_month || '');
          autoLoadDoneRef.current = true;
        }
      }
    }
  }, [userPreferences, interests, selectedInterests.length]); // added selectedInterests.length here

  async function fetchInterests() {
    try {
      const response = await axios.get(`${API_BASE_URL}/interests`);
      if (response.data && response.data.status === 'success') {
        setInterests(response.data.interests || []);
      } else {
        setInterests([]);
      }
    } catch {
      setInterests([
        'Adventure', 'Backwaters', 'Beach', 'Border Town', 'Capital',
        'Commercial', 'Crafts Village', 'Cultural', 'Heritage', 'Hill Station',
        'Historical', 'Luxury', 'Mountain Pass', 'Mountain Village',
        'Natural Landmark', 'Nature', 'Religious', 'Remote Valley',
        'Spiritual', 'Town', 'Tribal', 'Urban', 'Valley', 'Village', 'Wildlife'
      ]);
    }
  }

  async function autoFetchRecommendations(interests, month) {
    if (!interests || interests.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const requestData = { interests, month, max_risk: 10.0, min_rating: 0 };
      const response = await axios.post(`${API_BASE_URL}/recommend`, requestData);
      const recs = response.data.recommendations || [];
      const sortedRecs = recs.sort((a, b) => (b.tourist_rating || 0) - (a.tourist_rating || 0));
      setRecommendations(sortedRecs);

      if (sortedRecs.length === 0)
        setError('No destinations found matching your interests. Try different preferences.');
    } catch {
      setError('Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  }

  const handleGetRecommendations = async () => {
    if (selectedInterests.length === 0) {
      setError('Please select at least one interest');
      return;
    }
    setLoading(true);
    setError(null);
    setRecommendations([]);
    try {
      const requestData = { interests: selectedInterests, month: selectedMonth, max_risk: 10.0, min_rating: 0 };
      const response = await axios.post(`${API_BASE_URL}/recommend`, requestData);
      const recs = response.data.recommendations || [];
      const sortedRecs = recs.sort((a, b) => (b.tourist_rating || 0) - (a.tourist_rating || 0));
      setRecommendations(sortedRecs);

      if (sortedRecs.length === 0)
        setError('No destinations found matching your interests. Try selecting different interests or removing the month filter.');
    } catch {
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestChange = interest => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleViewWeather = async cityName => {
    if (weatherData[cityName]) {
      // Scroll to weather section
      if (weatherSectionRef.current) {
        weatherSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/weather/city/${cityName}`);
      setWeatherData(prev => ({ ...prev, [cityName]: response.data }));
      // Scroll to weather section
      if (weatherSectionRef.current) {
        weatherSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      // Optionally handle error
    }
  };

  const getRatingStars = rating => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return '⭐'.repeat(fullStars) + (hasHalfStar ? '⭐' : '') || '☆';
  };

  const getRiskBadge = riskIndex => {
    const scaled = (riskIndex || 0) * 10;
    if (scaled <= 3) return { variant: 'success', text: 'Low Risk' };
    if (scaled <= 6) return { variant: 'warning', text: 'Medium Risk' };
    return { variant: 'danger', text: 'High Risk' };
  };

  return (
    <div>
      <div className="page-header bg-primary text-white py-4">
        <Container>
          <h1>Get Recommendations</h1>
          <p className="mb-0">Discover destinations based on your interests and preferences</p>
        </Container>
      </div>

      <Container className="py-5">
        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        <Row className="mb-5">
          <Col lg={10} className="mx-auto">
            <div className="card shadow">
              <div className="card-body p-4">
                <h5 className="card-title mb-4">
                  <i className="fas fa-sliders-h me-2"></i>
                  Customize Your Preferences
                </h5>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">
                    Select your interests
                    <small className="text-muted ms-2">({selectedInterests.length} selected)</small>
                  </Form.Label>
                  <div className="row g-2">
                    {interests.map((interest, idx) => (
                      <Col md={3} sm={6} key={idx}>
                        <Form.Check
                          type="checkbox"
                          id={`interest-${idx}`}
                          label={interest}
                          checked={selectedInterests.includes(interest)}
                          onChange={() => handleInterestChange(interest)}
                          className="user-select-none"
                        />
                      </Col>
                    ))}
                  </div>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Preferred travel month</Form.Label>
                  <Form.Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                    <option value="">Any month</option>
                    {months.map((month, idx) => (
                      <option key={idx} value={month}>{month}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <div className="text-center">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleGetRecommendations}
                    disabled={selectedInterests.length === 0 || loading}
                    className="px-4"
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search me-2"></i>
                        Search Destinations
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Weather Cards */}
        <div ref={weatherSectionRef}>
          {Object.keys(weatherData).length > 0 && (
            <>
              <Row className="mb-3">
                <Col><h5><i className="fas fa-cloud-sun text-primary me-2"></i>Weather Information</h5></Col>
              </Row>
              <Row className="g-4 mb-5">
                {Object.entries(weatherData).map(([cityName, weather]) => (
                  <Col md={6} lg={4} key={cityName}>
                    <WeatherCard cityName={cityName} title={`Weather in ${cityName}`} />
                  </Col>
                ))}
              </Row>
            </>
          )}
        </div>

        {/* Recommendations Table */}
        {recommendations.length > 0 && (
          <Row className="mb-5">
            <Col>
              <div className="card shadow">
                <div className="card-body">
                  <h5 className="card-title mb-3">
                    <i className="fas fa-map-marked-alt text-primary me-2"></i>
                    Recommended Destinations
                    <Badge bg="secondary" className="ms-2">{recommendations.length} found</Badge>
                  </h5>
                  <p className="text-muted small mb-3">
                    Showing destinations matching: <strong>{selectedInterests.join(', ')}</strong>
                  </p>
                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>State</th>
                          <th>City</th>
                          <th>Category</th>
                          <th>Rating</th>
                          <th>Risk Level</th>
                          <th>Best Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recommendations.map((rec, idx) => {
                          const riskIndex = rec.risk_index || rec.risk || 0;
                          const riskBadge = getRiskBadge(riskIndex);
                          const scaledRisk = (riskIndex * 10).toFixed(1);
                          return (
                            <tr key={idx}>
                              <td className="fw-bold">{idx + 1}</td>
                              <td><strong>{rec.state_name || rec.state || 'N/A'}</strong></td>
                              <td><strong>{rec.city_name || rec.city || 'N/A'}</strong></td>
                              <td><Badge bg="info">{rec.category || 'N/A'}</Badge></td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <span className="me-2">{getRatingStars(rec.tourist_rating || rec.rating || 0)}</span>
                                  <span className="fw-bold">{(rec.tourist_rating || rec.rating || 0).toFixed(1)}</span>
                                </div>
                              </td>
                              <td>
                                <Badge bg={riskBadge.variant}>{scaledRisk}/10</Badge>
                                <div className="small text-muted">{riskBadge.text}</div>
                              </td>
                              <td>
                                <div className="small">
                                  <div className="fw-bold">{rec.best_time_to_visit || 'Year-round'}</div>
                                  {rec.popular_months && <div className="text-muted">Popular: {rec.popular_months}</div>}
                                </div>
                              </td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleViewWeather(rec.city_name || rec.city)}
                                >
                                  <i className="fas fa-cloud-sun me-1"></i>Weather
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default Recommendation;
