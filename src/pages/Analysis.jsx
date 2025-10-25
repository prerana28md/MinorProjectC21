import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import TrendChart from '../components/TrendChart';
import RiskChart from '../components/RiskChart';
import WeatherCard from '../components/WeatherCard';
import PredictionChart from '../components/PredictionChart';
import CategoryDonutChart from '../components/CategoryDonutChart';

const API_BASE_URL = 'http://127.0.0.1:5000';

const Analysis = () => {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [categoryPredictionData, setCategoryPredictionData] = useState(null);

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      console.log('State selected, fetching cities for:', selectedState);
      fetchCities(selectedState);
    } else {
      setCities([]);
    }
  }, [selectedState]);

  const fetchStates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/states`);
      console.log('States API Response:', response.data);
      setStates(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching states:', err);
      setError('Failed to load states');
    }
  };

  const fetchCities = async (stateName) => {
    try {
      console.log('Fetching cities for state:', stateName);
      
      const response = await axios.get(`${API_BASE_URL}/states/${stateName}/cities`);
      console.log('Cities API Response:', response.data);
      
      let cityNames = [];
      
      if (Array.isArray(response.data)) {
        cityNames = response.data.map(city => {
          if (typeof city === 'string') {
            return city;
          }
          return city.city_name || city.name || city.cityName || '';
        }).filter(name => name !== '');
      } else if (response.data && Array.isArray(response.data.cities)) {
        cityNames = response.data.cities;
      }
      
      console.log('Extracted city names:', cityNames);
      setCities(cityNames);
      
      if (cityNames.length === 0) {
        console.warn('No cities found for state:', stateName);
      }
    } catch (err) {
      console.error('Error fetching cities:', err);
      console.error('Error details:', err.response?.data || err.message);
      setCities([]);
      console.log('No cities available for this state');
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
    setPredictionData(null);
    setCategoryPredictionData(null);

    try {
      const [stateDetails, riskData, trendsData, predictionData] = await Promise.all([
        axios.get(`${API_BASE_URL}/states/${selectedState}`),
        axios.get(`${API_BASE_URL}/states/${selectedState}/risk`),
        axios.get(`${API_BASE_URL}/states/${selectedState}/tourism_trends`),
        axios.get(`${API_BASE_URL}/predict_trend/${selectedState}`)
      ]);

      console.log('Risk Data:', riskData.data);
      console.log('Prediction Data:', predictionData.data);

      const trendsArray = Object.entries(trendsData.data).map(([year, arrivals]) => ({
        year: year,
        arrivals: arrivals
      }));

      const riskFormatted = {
        risks: riskData.data.risks || {},
        health_alerts: riskData.data.health_alerts || '',
        safety_suggestions: riskData.data.safety_suggestions || '',
        insurance_available: riskData.data.insurance_available || '',
        major_disaster_years: riskData.data.major_disaster_years || '',
        hotspot_districts: riskData.data.hotspot_districts || ''
      };

      setAnalysisData({
        state: stateDetails.data,
        risk: riskFormatted,
        trends: { trends: trendsArray }
      });

      setPredictionData(predictionData.data);
      
      if (predictionData.data && predictionData.data.category_predictions) {
        const cats = Object.keys(predictionData.data.category_predictions);
        if (cats && cats.length > 0) {
          handleCategoryPrediction(cats[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching analysis data:', err);
      setError(`Failed to fetch analysis data: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPrediction = async (category) => {
    if (!selectedState || !category) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/predict_trend/${selectedState}/${category}`);
      console.log('Category Prediction Data:', response.data);
      setCategoryPredictionData(response.data);
    } catch (err) {
      console.error('Error fetching category prediction:', err);
    }
  };

  const getKeyInsights = () => {
    if (!analysisData) return null;

    const { state, risk, trends } = analysisData;
    const insights = [];

    if (trends && trends.trends && trends.trends.length > 1) {
      const latestYear = trends.trends[trends.trends.length - 1];
      const previousYear = trends.trends[trends.trends.length - 2];
      if (latestYear && previousYear && previousYear.arrivals > 0) {
        const growth = ((latestYear.arrivals - previousYear.arrivals) / previousYear.arrivals * 100).toFixed(1);
        insights.push(`Tourism growth: ${growth}% (${previousYear.year} to ${latestYear.year})`);
      }
    }

    if (risk && risk.risks && Object.keys(risk.risks).length > 0) {
      const riskValues = Object.values(risk.risks).map(v => parseFloat(v) || 0);
      const avgRisk = riskValues.reduce((sum, val) => sum + val, 0) / riskValues.length;
      insights.push(`Average risk level: ${avgRisk.toFixed(2)}`);
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
      <div className="page-header bg-primary text-white py-4">
        <Container>
          <h1>Destination Analysis</h1>
          <p className="mb-0">Analyze tourism trends, risks, and weather for any destination</p>
        </Container>
      </div>

      <Container className="py-5">
        {/* Selection Form */}
        <Row className="mb-5">
          <Col lg={8} className="mx-auto">
            <div className="card shadow">
              <div className="card-body p-4">
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
                          setAnalysisData(null);
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
                        disabled={!selectedState || loading || cities.length === 0}
                      >
                        <option value="">Choose a city...</option>
                        {Array.isArray(cities) && cities.map((city, index) => (
                          <option key={index} value={city}>
                            {city}
                          </option>
                        ))}
                      </Form.Select>
                      {selectedState && cities.length === 0 && (
                        <small className="text-muted d-block mt-1">
                          No cities available for this state
                        </small>
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
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
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
                title={`Historical Tourism Trends - ${selectedState}`}
              />
            </Col>

            {/* Risk Analysis Chart */}
            <Col lg={6}>
              <RiskChart 
                data={analysisData.risk} 
                title={`Risk Analysis - ${selectedState}`}
              />
            </Col>

            {/* Future Predictions */}
            {predictionData && predictionData.category_predictions && (
              <Col lg={12}>
                <div className="card shadow">
                  <div className="card-body">
                    <h5 className="card-title">Future Tourism Predictions</h5>
                    <p className="text-muted">Based on historical visitor data and machine learning models</p>
                    
                    <Row className="g-3">
                      {/* Category Ratings Donut Chart */}
                      <Col md={6}>
                        <div className="card bg-light">
                          <div className="card-body">
                            <h6 className="card-title">Category-wise Tourism Ratings</h6>
                            <CategoryDonutChart data={predictionData} />
                          </div>
                        </div>
                      </Col>
                      
                      {/* Historical and Future Predictions */}
                      <Col md={6}>
                        <div className="card bg-light">
                          <div className="card-body">
                            <h6 className="card-title">Historical and Future Tourism Trends</h6>
                            {categoryPredictionData ? (
                              <PredictionChart 
                                data={categoryPredictionData}
                                title="Visitor Predictions"
                              />
                            ) : (
                              <p className="text-muted">Select a category to view predictions</p>
                            )}
                          </div>
                        </div>
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

            {/* Key Insights - Fixed: removed h-100 class */}
            <Col lg={6}>
              <div className="card shadow">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="fas fa-lightbulb text-warning me-2"></i>
                    Key Insights
                  </h5>
                  {getKeyInsights() && getKeyInsights().length > 0 ? (
                    <ul className="list-unstyled mb-3">
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
                      <h6 className="border-bottom pb-2 mb-3">
                        <i className="fas fa-info-circle text-primary me-2"></i>
                        State Information
                      </h6>
                      <div className="row g-3">
                        {analysisData.state.capital && (
                          <div className="col-6">
                            <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                              <small className="text-muted d-block">
                                <i className="fas fa-landmark me-1"></i>
                                Capital
                              </small>
                              <div className="fw-bold">{analysisData.state.capital}</div>
                            </div>
                          </div>
                        )}
                        {analysisData.state.population && (
                          <div className="col-6">
                            <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                              <small className="text-muted d-block">
                                <i className="fas fa-users me-1"></i>
                                Population
                              </small>
                              <div className="fw-bold">{analysisData.state.population.toLocaleString()}</div>
                            </div>
                          </div>
                        )}
                        {analysisData.state.gdp_inr_crore && (
                          <div className="col-6">
                            <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                              <small className="text-muted d-block">
                                <i className="fas fa-chart-line me-1"></i>
                                GDP
                              </small>
                              <div className="fw-bold">₹{analysisData.state.gdp_inr_crore.toLocaleString()} Cr</div>
                            </div>
                          </div>
                        )}
                        {analysisData.state.literacy_rate && (
                          <div className="col-6">
                            <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                              <small className="text-muted d-block">
                                <i className="fas fa-graduation-cap me-1"></i>
                                Literacy Rate
                              </small>
                              <div className="fw-bold">{analysisData.state.literacy_rate}%</div>
                            </div>
                          </div>
                        )}
                        {analysisData.state.safety_index && (
  <div className="col-6">
    <div className="p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
      <small className="text-muted d-block">
        <i className="fas fa-shield-alt me-1"></i>
        Safety Index
      </small>
      <div className="fw-bold">{(analysisData.state.safety_index * 10).toFixed(1)}/10</div>
    </div>
  </div>
)}

                        {analysisData.state.best_time_to_visit && (
                          <div className="col-12">
                            <div className="p-2 rounded" style={{ backgroundColor: '#e8f5e9' }}>
                              <small className="text-muted d-block">
                                <i className="fas fa-calendar-alt me-1"></i>
                                Best Time to Visit
                              </small>
                              <div className="fw-bold text-success">{analysisData.state.best_time_to_visit}</div>
                            </div>
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
