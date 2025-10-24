import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner, Table } from 'react-bootstrap';
import { aiAPI, weatherAPI, mockAiAPI, dataAPI } from '../services/api';
import WeatherCard from '../components/WeatherCard';

const Recommendation = () => {
  const [interests, setInterests] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState({});

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchInterests();
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      console.log('Testing backend connection...');
      const response = await dataAPI.getStates();
      console.log('Backend connection test successful:', response.data?.length || 0, 'states found');
    } catch (err) {
      console.log('Backend connection test failed:', err);
    }
  };

  const fetchInterests = async () => {
    try {
      // Try to fetch interests from backend
      console.log('Fetching interests from backend...');
      const response = await dataAPI.getInterests();
      console.log('Interests response:', response.data);
      setInterests(response.data);
    } catch (err) {
      console.log('Error fetching interests:', err);
      console.log('Using fallback interests');
      // Fallback to hardcoded interests if backend fails
      const fallbackInterests = [
        'Hill Station', 'Beach', 'Heritage', 'Religious', 'Wildlife', 
        'Nature', 'Cultural', 'Historical', 'Adventure', 'Spiritual'
      ];
      setInterests(fallbackInterests);
    }
  };

  const handleInterestChange = (interest) => {
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      } else {
        return [...prev, interest];
      }
    });
  };

  const handleGetRecommendations = async () => {
    if (selectedInterests.length === 0) {
      setError('Please select at least one interest');
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendations([]);

    try {
      const requestData = {
        interests: selectedInterests,
        month: selectedMonth,
        max_risk: 1.0,
        min_rating: 0
      };
      
      console.log('Sending recommendation request:', requestData);
      const response = await aiAPI.postRecommendations(requestData);
      console.log('Recommendation response:', response.data);
      console.log('Recommendations array:', response.data.recommendations);
      console.log('Recommendations length:', response.data.recommendations?.length || 0);
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.log('Error getting recommendations:', err);
      console.log('Error details:', err.response?.data || err.message);
      console.log('Using mock data for recommendations');
      const mockResponse = await mockAiAPI.getRecommendations();
      setRecommendations(mockResponse.data.recommendations || []);
    } finally {
      setLoading(false);
    }
  };

  const handleViewWeather = async (cityName) => {
    if (weatherData[cityName]) return; // Already fetched

    try {
      const response = await weatherAPI.getCityWeather(cityName);
      setWeatherData(prev => ({
        ...prev,
        [cityName]: response.data
      }));
    } catch (err) {
      console.error('Failed to fetch weather for', cityName);
    }
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('⭐');
    }
    return stars.join('');
  };

  const getRiskBadge = (riskIndex) => {
    if (riskIndex <= 2) return { variant: 'success', text: 'Low Risk' };
    if (riskIndex <= 4) return { variant: 'warning', text: 'Medium Risk' };
    return { variant: 'danger', text: 'High Risk' };
  };

  return (
    <div>
      <div className="page-header">
        <Container>
          <h1>Get Recommendations</h1>
          <p>Discover destinations based on your interests and preferences</p>
        </Container>
      </div>

      <Container className="py-5">
        {/* Selection Form */}
        <Row className="mb-5">
          <Col lg={8} className="mx-auto">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title mb-4">Tell us your preferences</h5>
                
                {/* Interests Selection */}
                <Form.Group className="mb-4">
                  <Form.Label>Select your interests (choose multiple)</Form.Label>
                  <div className="row g-2">
                    {interests.map((interest, index) => (
                      <Col md={4} sm={6} key={index}>
                        <Form.Check
                          type="checkbox"
                          id={`interest-${index}`}
                          label={interest}
                          checked={selectedInterests.includes(interest)}
                          onChange={() => handleInterestChange(interest)}
                        />
                      </Col>
                    ))}
                  </div>
                </Form.Group>

                {/* Month Selection */}
                <Form.Group className="mb-4">
                  <Form.Label>Preferred travel month (optional)</Form.Label>
                  <Form.Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    <option value="">Any month</option>
                    {months.map((month, index) => (
                      <option key={index} value={month}>
                        {month}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <div className="text-center">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={handleGetRecommendations}
                    disabled={selectedInterests.length === 0 || loading}
                    className="me-2"
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Getting Recommendations...
                      </>
                    ) : (
                      'Get Recommendations'
                    )}
                  </Button>
                  
                  {/* Debug button */}
                  {process.env.NODE_ENV === 'development' && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={async () => {
                        console.log('Manual API test...');
                        try {
                          const response = await aiAPI.postRecommendations({
                            interests: ['Adventure'],
                            max_risk: 1.0,
                            min_rating: 0
                          });
                          console.log('Manual test response:', response.data);
                        } catch (err) {
                          console.log('Manual test error:', err);
                        }
                      }}
                    >
                      Test API
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Error Alert */}
        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger">{error}</Alert>
            </Col>
          </Row>
        )}

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <Row className="mb-4">
            <Col>
              <Alert variant="info">
                <strong>Debug Info:</strong><br/>
                Available interests: {interests.length} options<br/>
                Selected interests: {selectedInterests.join(', ') || 'None'}<br/>
                Selected month: {selectedMonth || 'Any month'}<br/>
                Recommendations found: {recommendations.length}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Recommendations Table */}
        {recommendations.length > 0 && (
          <Row className="mb-5">
            <Col>
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title mb-4">Recommended Destinations</h5>
                  <div className="table-responsive">
                    <Table hover>
                      <thead>
                        <tr>
                          <th>State</th>
                          <th>City</th>
                          <th>Rating</th>
                          <th>Risk Index</th>
                          <th>Best Month</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recommendations.map((rec, index) => {
                          const riskBadge = getRiskBadge(rec.risk_index || rec.risk || 0);
                          return (
                            <tr key={index}>
                              <td>
                                <strong>{rec.state_name || rec.state}</strong>
                              </td>
                              <td>
                                <div>
                                  <strong>{rec.city_name || rec.city}</strong>
                                  <div className="small text-muted">
                                    <span className="badge bg-secondary me-1">{rec.category}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <span className="me-2">
                                    {getRatingStars(rec.tourist_rating || rec.rating || 0)}
                                  </span>
                                  <span className="fw-bold">
                                    {(rec.tourist_rating || rec.rating || 0).toFixed(1)}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className={`badge bg-${riskBadge.variant}`}>
                                  {rec.risk_index || rec.risk || 0}/10
                                </span>
                                <div className="small text-muted">{riskBadge.text}</div>
                              </td>
                              <td>
                                <div>
                                  <div className="fw-bold">{rec.best_time_to_visit || rec.best_month || 'Year-round'}</div>
                                  <div className="small text-muted">Popular: {rec.popular_months || 'N/A'}</div>
                                </div>
                              </td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleViewWeather(rec.city_name || rec.city)}
                                >
                                  View Weather
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

        {/* Weather Cards */}
        {Object.keys(weatherData).length > 0 && (
          <Row className="g-4">
            <Col>
              <h5 className="mb-4">Weather Information</h5>
            </Col>
          </Row>
        )}
        
        <Row className="g-4">
          {Object.entries(weatherData).map(([cityName, weather]) => (
            <Col md={6} lg={4} key={cityName}>
              <WeatherCard 
                cityName={cityName}
                title={`Weather in ${cityName}`}
              />
            </Col>
          ))}
        </Row>

        {/* No Results */}
        {recommendations.length === 0 && !loading && !error && (
          <Row>
            <Col className="text-center py-5">
              <div className="fs-1 text-muted mb-3">🎯</div>
              <h5>No recommendations found</h5>
              <p className="text-muted">
                Try adjusting your interests or travel month. The system couldn't find destinations matching your current preferences.
              </p>
              <div className="mt-3">
                <small className="text-muted">
                  <strong>Selected interests:</strong> {selectedInterests.join(', ') || 'None'}<br/>
                  <strong>Selected month:</strong> {selectedMonth || 'Any month'}
                </small>
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default Recommendation;
