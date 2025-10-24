import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { dataAPI, mockDataAPI } from '../services/api';
import TrendChart from '../components/TrendChart';
import RiskChart from '../components/RiskChart';
import WeatherCard from '../components/WeatherCard';
import PredictionChart from '../components/PredictionChart';

const Analysis = () => {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryPredictionData, setCategoryPredictionData] = useState(null);

  useEffect(() => {
    fetchStates();
  }, []);

  // Debug: Test API connection
  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing API connection...');
        const response = await dataAPI.getStates();
        console.log('API test successful:', response.data);
      } catch (err) {
        console.error('API test failed:', err);
      }
    };
    testAPI();
  }, []);

  useEffect(() => {
    if (selectedState) {
      console.log('State selected, fetching cities for:', selectedState);
      fetchCities(selectedState);
    }
  }, [selectedState]);

  const fetchStates = async () => {
    try {
      const response = await dataAPI.getStates();
      console.log('States API Response:', response.data);
      setStates(response.data);
    } catch (err) {
      console.log('Using mock data for states');
      const mockResponse = await mockDataAPI.getStates();
      setStates(mockResponse.data);
    }
  };

  const fetchCities = async (stateName) => {
    try {
      console.log('Fetching cities for state:', stateName);
      
      // Try different state name formats
      let response;
      try {
        response = await dataAPI.getStateCities(stateName);
      } catch (firstErr) {
        console.log('First attempt failed, trying with different format...');
        // Try with different case or format
        const alternativeName = stateName.toLowerCase();
        response = await dataAPI.getStateCities(alternativeName);
      }
      
      console.log('Cities API Response:', response.data);
      
      // Backend returns array of city objects, extract city names
      const cityNames = Array.isArray(response.data) 
        ? response.data.map(city => {
            console.log('City object:', city);
            return city.city_name || city.name || city;
          })
        : [];
      console.log('Extracted city names:', cityNames);
      setCities(cityNames);
    } catch (err) {
      console.error('Error fetching cities:', err);
      console.log('Using mock data for cities');
      const mockResponse = await mockDataAPI.getStateCities(stateName);
      setCities(Array.isArray(mockResponse.data) ? mockResponse.data : []);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedState) {
      setError('Please select a state');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const [stateDetails, riskData, trendsData, predictionData] = await Promise.all([
        dataAPI.getStateDetails(selectedState),
        dataAPI.getStateRisk(selectedState),
        dataAPI.getStateTourismTrends(selectedState),
        dataAPI.getPredictTrends(selectedState)
      ]);

      // Convert trends object to array format for charts
      const trendsArray = Object.entries(trendsData.data).map(([year, arrivals]) => ({
        year: year,
        arrivals: arrivals
      }));

      // Convert risk data to array format for charts
      const riskArray = Object.entries(riskData.data)
        .filter(([key, value]) => key !== 'state' && typeof value === 'number')
        .map(([type, level]) => ({
          type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          level: level
        }));

      // Get available categories for predictions
      const categories = predictionData.data?.category_predictions ? 
        Object.keys(predictionData.data.category_predictions) : [];

      setAnalysisData({
        state: stateDetails.data,
        risk: { risks: riskArray },
        trends: { trends: trendsArray }
      });

      setPredictionData(predictionData.data);
      setAvailableCategories(categories);
    } catch (err) {
      console.log('Using mock data for analysis');
      try {
        const [stateDetails, riskData, trendsData] = await Promise.all([
          mockDataAPI.getStateDetails(selectedState),
          mockDataAPI.getStateRisk(selectedState),
          mockDataAPI.getStateTourismTrends(selectedState)
        ]);

        setAnalysisData({
          state: stateDetails.data,
          risk: riskData.data,
          trends: trendsData.data
        });
      } catch (mockErr) {
        setError('Failed to fetch analysis data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPrediction = async (category) => {
    if (!selectedState || !category) return;

    try {
      const response = await dataAPI.getPredictTrendsByCategory(selectedState, category);
      setCategoryPredictionData(response.data);
    } catch (err) {
      console.error('Error fetching category prediction:', err);
    }
  };

  const getKeyInsights = () => {
    if (!analysisData) return null;

    const { state, risk, trends } = analysisData;
    const insights = [];

    if (trends && trends.trends && trends.trends.length > 0) {
      const latestYear = trends.trends[trends.trends.length - 1];
      const previousYear = trends.trends[trends.trends.length - 2];
      if (latestYear && previousYear) {
        const growth = ((latestYear.arrivals - previousYear.arrivals) / previousYear.arrivals * 100).toFixed(1);
        insights.push(`Tourism growth: ${growth}%`);
      }
    }

    if (risk && risk.risks) {
      const avgRisk = risk.risks.reduce((sum, r) => sum + (r.level || r.score || 0), 0) / risk.risks.length;
      insights.push(`Average risk level: ${avgRisk.toFixed(1)}/10`);
    }

    if (state && state.best_month) {
      insights.push(`Best travel month: ${state.best_month}`);
    }

    if (state && state.top_category) {
      insights.push(`Top category: ${state.top_category}`);
    }

    return insights;
  };

  return (
    <div>
      <div className="page-header">
        <Container>
          <h1>Destination Analysis</h1>
          <p>Analyze tourism trends, risks, and weather for any destination</p>
        </Container>
      </div>

      <Container className="py-5">
        {/* Selection Form */}
        <Row className="mb-5">
          <Col lg={8} className="mx-auto">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title mb-4">Select Destination</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>State</Form.Label>
                      <Form.Select
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          setSelectedCity('');
                        }}
                        disabled={loading}
                      >
                        <option value="">Choose a state...</option>
                        {Array.isArray(states) && states.map((state, index) => (
                          <option key={index} value={state}>
                            {state}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>City (Optional)</Form.Label>
                      <Form.Select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        disabled={!selectedState || loading}
                      >
                        <option value="">Choose a city...</option>
                        {Array.isArray(cities) && cities.map((city, index) => (
                          <option key={index} value={city}>
                            {city}
                          </option>
                        ))}
                      </Form.Select>
                      {/* Debug info */}
                      <small className="text-muted">
                        Cities loaded: {cities.length} | Selected state: {selectedState}
                      </small>
                      {selectedState && (
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => fetchCities(selectedState)}
                        >
                          Refresh Cities
                        </Button>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="text-center mt-4">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={handleAnalyze}
                    disabled={!selectedState || loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Analyzing...
                      </>
                    ) : (
                      'Analyze Destination'
                    )}
                  </Button>
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

        {/* Analysis Results */}
        {analysisData && (
          <Row className="g-4">
            {/* Tourism Trends Chart */}
            <Col lg={6}>
              <TrendChart 
                data={analysisData.trends} 
                title="Historical Tourism Trends (Visitors)"
              />
            </Col>

            {/* Risk Analysis Chart */}
            <Col lg={6}>
              <RiskChart 
                data={analysisData.risk} 
                title="Risk Analysis"
              />
            </Col>

            {/* Future Predictions */}
            {predictionData && (
              <Col lg={12}>
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">Future Tourism Predictions</h6>
                    <p className="text-muted">Based on historical visitor data and machine learning models</p>
                    
                    {/* Category Selection */}
                    {availableCategories.length > 0 && (
                      <div className="mb-3">
                        <Form.Label>Select Category for Detailed Predictions:</Form.Label>
                        <div className="d-flex flex-wrap gap-2">
                          {availableCategories.map((category, index) => (
                            <Button
                              key={index}
                              variant={selectedCategory === category ? "primary" : "outline-primary"}
                              size="sm"
                              onClick={() => {
                                setSelectedCategory(category);
                                handleCategoryPrediction(category);
                              }}
                            >
                              {category}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overall Predictions */}
                    <Row className="g-3">
                      <Col md={6}>
                        <div className="card bg-light">
                          <div className="card-body">
                            <h6 className="card-title">Overall Predictions</h6>
                            <div className="row g-2">
                              {predictionData.category_predictions && 
                                Object.entries(predictionData.category_predictions).map(([category, data]) => (
                                  <div key={category} className="col-6">
                                    <small className="text-muted">{category}</small>
                                    <div className="fw-bold">
                                      {data.predicted_visitors_by_year['2026']?.toLocaleString() || 'N/A'}
                                    </div>
                                    <small className="text-success">
                                      Avg Rating: {data.average_tourist_rating}
                                    </small>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        </div>
                      </Col>
                      
                      <Col md={6}>
                        {categoryPredictionData && (
                          <PredictionChart 
                            data={categoryPredictionData}
                            title={`${selectedCategory} Predictions`}
                            selectedCategory={selectedCategory}
                          />
                        )}
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
            )}

            {/* Weather Card */}
            <Col lg={6}>
              <WeatherCard 
                cityName={selectedCity}
                stateName={selectedState}
                title="Weather Forecast"
              />
            </Col>

            {/* Key Insights */}
            <Col lg={6}>
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Key Insights</h6>
                  {getKeyInsights() ? (
                    <ul className="list-unstyled">
                      {getKeyInsights().map((insight, index) => (
                        <li key={index} className="mb-2">
                          <i className="fas fa-check-circle text-success me-2"></i>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">No insights available</p>
                  )}
                  
                  {analysisData.state && (
                    <div className="mt-4">
                      <h6>State Information</h6>
                      <div className="row g-2">
                        {analysisData.state.capital && (
                          <div className="col-6">
                            <small className="text-muted">Capital:</small>
                            <div className="fw-bold">{analysisData.state.capital}</div>
                          </div>
                        )}
                        {analysisData.state.population && (
                          <div className="col-6">
                            <small className="text-muted">Population:</small>
                            <div className="fw-bold">{analysisData.state.population.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default Analysis;
