import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Row, Col, Form, Button, Alert, Spinner, Table, Badge, Collapse
} from 'react-bootstrap';
import axios from 'axios';
import WeatherCard from '../components/WeatherCard';
import '@fortawesome/fontawesome-free/css/all.min.css';

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
  const [openDescription, setOpenDescription] = useState(null);

  // NEW: Nearby places states
  const [nearbyPlacesData, setNearbyPlacesData] = useState(null); // { city: 'City, State', data: {...} }
  const [fetchingNearby, setFetchingNearby] = useState(null); // cityKey while fetching
  const [openNearbyCity, setOpenNearbyCity] = useState(null); // cityKey currently open

  // NEW: To track which cities have been added to the bucket list
  const [addedDestinations, setAddedDestinations] = useState({});

  const autoLoadDoneRef = useRef(false);
  const weatherSectionRef = useRef(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load user preferences from localStorage (if present)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Initial fetch of interests
  useEffect(() => {
    fetchInterests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load saved preferences
  useEffect(() => {
    loadUserPreferences();
  }, [loadUserPreferences]);

  // When preferences & interests are ready, auto-fetch recommendations once
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPreferences, interests, selectedInterests.length]);

  async function fetchInterests() {
    try {
      const response = await axios.get(`${API_BASE_URL}/interests`);
      if (response.data && response.data.status === 'success') {
        setInterests(response.data.interests || []);
      } else {
        setInterests([]);
      }
    } catch {
      // fallback hardcoded interests
      setInterests([
        'Adventure', 'Backwaters', 'Beach', 'Border Town', 'Capital',
        'Commercial', 'Crafts Village', 'Cultural', 'Heritage', 'Hill Station',
        'Historical', 'Luxury', 'Mountain Pass', 'Mountain Village',
        'Natural Landmark', 'Nature', 'Religious', 'Remote Valley',
        'Spiritual', 'Town', 'Tribal', 'Urban', 'Valley', 'Village', 'Wildlife'
      ]);
    }
  }

  async function autoFetchRecommendations(interestsArr, month) {
    if (!interestsArr || interestsArr.length === 0) return;
    setLoading(true);
    setError(null);
    setAddedDestinations({}); // Reset added status on new search
    try {
      const requestData = { interests: interestsArr, month, max_risk: 10.0, min_rating: 0 };
      const response = await axios.post(`${API_BASE_URL}/recommend`, requestData);
      const recs = response.data.recommendations || [];
      const sortedRecs = recs.sort((a, b) => (b.tourist_rating || b.rating || 0) - (a.tourist_rating || a.rating || 0));
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
    setOpenDescription(null);
    setAddedDestinations({}); // Reset added status on new search
    try {
      const requestData = { interests: selectedInterests, month: selectedMonth, max_risk: 10.0, min_rating: 0 };
      const response = await axios.post(`${API_BASE_URL}/recommend`, requestData);
      const recs = response.data.recommendations || [];
      const sortedRecs = recs.sort((a, b) => (b.tourist_rating || b.rating || 0) - (a.tourist_rating || a.rating || 0));
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
      if (weatherSectionRef.current) {
        weatherSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/weather/city/${encodeURIComponent(cityName)}`);
      setWeatherData(prev => ({ ...prev, [cityName]: response.data }));
      if (weatherSectionRef.current) {
        weatherSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      // Optionally handle error (set fallback)
      setWeatherData(prev => ({ ...prev, [cityName]: { temp: 'N/A', condition: 'N/A' } }));
    }
  };

  const handleAddToBucketList = async (rec) => {
    const username = localStorage.getItem('username');
    const cityName = rec.city_name || rec.city;

    if (!username) {
      alert('Login required to use your bucket list!');
      return;
    }

    if (!cityName) return; // Guard against missing city name

    try {
      await axios.post(`${API_BASE_URL}/user/${encodeURIComponent(username)}/bucket`, rec);

      // On success, update state to visually mark as added
      setAddedDestinations(prev => ({ ...prev, [cityName]: true }));
    } catch (e) {
      console.error('Failed to add to bucket list:', e);
      alert('Failed to add to bucket list.');
    }
  };

  const toggleDescription = (index) => {
    setOpenDescription(openDescription === index ? null : index);
  };

  const getRatingStars = rating => {
    const r = Number(rating) || 0;
    const fullStars = Math.floor(r);
    const hasHalfStar = (r - fullStars) >= 0.5;
    let stars = '⭐'.repeat(fullStars);
    if (hasHalfStar) stars += '⭐';
    return stars || '☆';
  };

  const getRiskBadge = riskIndex => {
    const r = Number(riskIndex) || 0;
    const scaled = r * 10;
    if (scaled <= 3) return { variant: 'success', text: 'Low Risk' };
    if (scaled <= 6) return { variant: 'warning', text: 'Medium Risk' };
    return { variant: 'danger', text: 'High Risk' };
  };

  // -----------------------------
  // NEW: Nearby Places functions
  // -----------------------------

  /**
   * Fetch nearby tourist places from backend Overpass proxy endpoint.
   * Uses axios directly (keeps file style consistent).
   * @param {string} cityName
   * @param {string} stateName
   */
  const fetchNearbyPlaces = async (cityName, stateName) => {
    const fullPlace = `${cityName}, ${stateName}`;
    const cityKey = fullPlace;

    // If same city clicked again -> toggle close
    if (openNearbyCity === cityKey) {
      setOpenNearbyCity(null);
      return;
    }

    setFetchingNearby(cityKey);
    setNearbyPlacesData(null);
    setError(null);

    try {
      const resp = await axios.get(`${API_BASE_URL}/nearbyplaces/overpass`, {
        params: { place: fullPlace, radius: 5000 },
      });

      // Expecting { place, coordinates, count, places: [...] }
      if (resp.data) {
        setNearbyPlacesData({ city: cityKey, data: resp.data });
        setOpenNearbyCity(cityKey);
      } else {
        setNearbyPlacesData({ city: cityKey, data: { count: 0, places: [] } });
        setOpenNearbyCity(cityKey);
      }
    } catch (e) {
      console.error('Nearby fetch failed:', e);
      setError(`Failed to fetch nearby places for ${fullPlace}`);
    } finally {
      setFetchingNearby(null);
    }
  };

  const renderNearbyPlaces = (data) => {
    const places = data.places || [];

    if (!places || places.length === 0) {
      return (
        <div className="p-3 bg-light border-top border-bottom text-center text-muted">
          <i className="fas fa-exclamation-circle me-2"></i>
          No major tourist attractions found within 5 km of {data.place}.
        </div>
      );
    }

    return (
      <div className="p-4 bg-white border-top border-bottom">
        <h6 className="text-primary mb-3">
          <i className="fas fa-search-location me-2"></i>
          Nearby Attractions ({data.count})
        </h6>

        <Row>
          {places.map((p, idx) => {
            const placeName = (p.tags && (p.tags.name || p.tags.tourism || p.tags.amenity)) || 'Unnamed Location';
            const placeType = (p.tags && (p.tags.tourism || p.tags.amenity || 'attraction')).replace(/_/g, ' ');
            const lat = p.lat || (p.center && p.center.lat);
            const lon = p.lon || (p.center && p.center.lon);
            const mapLink = lat && lon ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}` : '#';

            return (
              <Col key={idx} xs={12} sm={6} md={4} className="mb-3">
                <div className="shadow-sm p-3 rounded" style={{ backgroundColor: '#fbfbfd' }}>
                  <div className="d-flex align-items-start">
                    <div className="me-3">
                      <i className="fas fa-map-marker-alt fa-2x text-danger"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold">{placeName}</div>
                      <div className="text-muted small mb-2">Type: <strong>{placeType}</strong></div>
                      <div className="d-flex gap-2">
                        <Button
                          href={mapLink}
                          target="_blank"
                          rel="noreferrer"
                          size="sm"
                          variant="outline-primary"
                        >
                          <i className="fas fa-external-link-alt me-1"></i>View on Map
                        </Button>
                        {/* <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => {
                            if (lat && lon) {
                              const gUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
                              window.open(gUrl, '_blank', 'noopener');
                            } else {
                              alert('Coordinates not available for this place.');
                            }
                          }}
                        >
                          <i className="fab fa-google me-1"></i>Open in Maps
                        </Button> */}
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div>
      <div className="page-header bg-primary text-white py-4">
        <Container fluid>
          <h1>Get Recommendations</h1>
          <p className="mb-0">Discover destinations based on your interests and preferences</p>
        </Container>
      </div>

      <Container fluid className="py-5">
        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Customization Section */}
        <Row className="mb-5">
          <Col lg={12}>
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

        {/* Weather Section */}
        <div ref={weatherSectionRef}>
          {Object.keys(weatherData).length > 0 && (
            <>
              <Row className="mb-3">
                <Col><h5><i className="fas fa-cloud-sun text-primary me-2"></i>Weather Information</h5></Col>
              </Row>
              <Row className="g-4 mb-5">
                {Object.entries(weatherData).map(([cityName, weather]) => (
                  <Col md={6} lg={4} key={cityName}>
                    <WeatherCard cityName={cityName} title={`Weather in ${cityName}`} weatherData={weather} />
                  </Col>
                ))}
              </Row>
            </>
          )}
        </div>

        {/* Recommended Destinations Table */}
        {recommendations.length > 0 && (
          <Row className="mb-5">
            <Col lg={12}>
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
                          <th style={{ minWidth: '320px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recommendations.map((rec, idx) => {
                          const riskIndex = rec.risk_index || rec.risk || 0;
                          const riskBadge = getRiskBadge(riskIndex);
                          const scaledRisk = (Number(riskIndex) * 10).toFixed(1);
                          const cityName = rec.city_name || rec.city || rec.cityName;
                          const description = rec.description || 'No Description Available';
                          const stateName = rec.state_name || rec.state || rec.stateName || 'N/A';
                          const isAdded = !!addedDestinations[cityName];
                          const placeKey = `${cityName}, ${stateName}`;

                          return (
                            <React.Fragment key={idx}>
                              <tr>
                                <td className="fw-bold">{idx + 1}</td>
                                <td><strong>{stateName}</strong></td>
                                <td><strong>{cityName || 'N/A'}</strong></td>
                                <td><Badge bg="info">{rec.category || 'N/A'}</Badge></td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <span className="me-2">{getRatingStars(rec.tourist_rating || rec.rating || 0)}</span>
                                    <span className="fw-bold">{(Number(rec.tourist_rating || rec.rating || 0)).toFixed(1)}</span>
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
                                  <div className="d-flex flex-wrap gap-2">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => handleViewWeather(cityName)}
                                    >
                                      <i className="fas fa-cloud-sun me-1"></i>Weather
                                    </Button>

                                    <Button
                                      variant={isAdded ? "success" : "outline-success"}
                                      size="sm"
                                      onClick={() => handleAddToBucketList(rec)}
                                      disabled={isAdded}
                                    >
                                      <i className={`fas ${isAdded ? 'fa-check' : 'fa-plus-circle'} me-1`}></i>
                                      {isAdded ? 'Added' : 'Add'}
                                    </Button>

                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={() => toggleDescription(idx)}
                                      aria-expanded={openDescription === idx}
                                    >
                                      <i className="fas fa-info-circle me-1"></i>
                                      {openDescription === idx ? 'Hide Desc' : 'Description'}
                                    </Button>

                                    {/* NEW: Nearby Button */}
                                    <Button
                                      variant={openNearbyCity === placeKey ? "danger" : "outline-primary"}
                                      size="sm"
                                      onClick={() => fetchNearbyPlaces(cityName, stateName)}
                                      disabled={fetchingNearby === placeKey}
                                    >
                                      {fetchingNearby === placeKey ? (
                                        <Spinner size="sm" animation="border" />
                                      ) : (
                                        <>
                                          <i className="fas fa-map-marker-alt me-1"></i>
                                          {openNearbyCity === placeKey ? 'Hide Nearby' : 'Nearby'}
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </td>
                              </tr>

                              {/* Description Row */}
                              <tr>
                                <td colSpan="8" className="p-0 border-0">
                                  <Collapse in={openDescription === idx}>
                                    <div className="p-3 bg-light border-top border-bottom">
                                      <strong className="text-primary d-block mb-1">Description:</strong>
                                      {description}
                                    </div>
                                  </Collapse>
                                </td>
                              </tr>

                              {/* Nearby Places Row */}
                              <tr>
                                <td colSpan="8" className="p-0 border-0">
                                  <Collapse in={openNearbyCity === placeKey}>
                                    <div>
                                      {nearbyPlacesData?.city === placeKey && nearbyPlacesData?.data &&
                                        renderNearbyPlaces(nearbyPlacesData.data)}
                                    </div>
                                  </Collapse>
                                </td>
                              </tr>
                            </React.Fragment>
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
