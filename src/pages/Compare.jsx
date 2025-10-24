import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { dataAPI, aiAPI, mockDataAPI, mockAiAPI } from '../services/api';
import CompareCard from '../components/CompareCard';

const Compare = () => {
  const [states, setStates] = useState([]);
  const [cities1, setCities1] = useState([]);
  const [cities2, setCities2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [activeTab, setActiveTab] = useState('states');

  // State comparison
  const [state1, setState1] = useState('');
  const [state2, setState2] = useState('');

  // City comparison
  const [cityState1, setCityState1] = useState('');
  const [cityState2, setCityState2] = useState('');
  const [city1, setCity1] = useState('');
  const [city2, setCity2] = useState('');

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (cityState1) {
      fetchCities(cityState1, 'cities1');
    }
  }, [cityState1]);

  useEffect(() => {
    if (cityState2) {
      fetchCities(cityState2, 'cities2');
    }
  }, [cityState2]);

  const fetchStates = async () => {
    try {
      const response = await dataAPI.getStates();
      setStates(response.data);
    } catch (err) {
      console.log('Using mock data for states');
      const mockResponse = await mockDataAPI.getStates();
      setStates(mockResponse.data);
    }
  };

  const fetchCities = async (stateName, setter) => {
    try {
      const response = await dataAPI.getStateCities(stateName);
      console.log('Cities API Response:', response.data);
      
      // Backend returns array of city objects, extract city names
      const citiesData = Array.isArray(response.data) 
        ? response.data.map(city => city.city_name || city.name || city)
        : [];
      console.log('Extracted city names:', citiesData);
      
      if (setter === 'cities1') {
        setCities1(citiesData);
      } else {
        setCities2(citiesData);
      }
    } catch (err) {
      console.log('Using mock data for cities');
      const mockResponse = await mockDataAPI.getStateCities(stateName);
      const citiesData = Array.isArray(mockResponse.data) ? mockResponse.data : [];
      if (setter === 'cities1') {
        setCities1(citiesData);
      } else {
        setCities2(citiesData);
      }
    }
  };

  const handleStateCompare = async () => {
    if (!state1 || !state2) {
      setError('Please select both states');
      return;
    }

    setLoading(true);
    setError(null);
    setComparisonData(null);

    try {
      const response = await aiAPI.compareStates(state1, state2);
      console.log('API Response:', response.data);
      
      // Extract data from backend response format
      const data = response.data;
      
      // Calculate tourism growth from visitor data
      const state1Growth = data.visitors_2024 && data.visitors_2023 ? 
        ((data.visitors_2024[state1] - data.visitors_2023[state1]) / data.visitors_2023[state1] * 100).toFixed(1) : 0;
      const state2Growth = data.visitors_2024 && data.visitors_2023 ? 
        ((data.visitors_2024[state2] - data.visitors_2023[state2]) / data.visitors_2023[state2] * 100).toFixed(1) : 0;
      
      // Parse famous_for and best_season arrays (they come as strings with single quotes)
      const parseArray = (arrStr) => {
        if (typeof arrStr === 'string') {
          try {
            // Replace single quotes with double quotes for valid JSON
            const jsonStr = arrStr.replace(/'/g, '"');
            return JSON.parse(jsonStr);
          } catch {
            // If JSON parsing fails, try to extract values manually
            const matches = arrStr.match(/'([^']+)'/g);
            if (matches) {
              return matches.map(match => match.slice(1, -1));
            }
            return [arrStr];
          }
        }
        return Array.isArray(arrStr) ? arrStr : [arrStr];
      };
      
      // Convert backend response to frontend format
      const comparisonData = {
        state1_data: {
          name: state1,
          tourism_growth: parseFloat(state1Growth),
          risk_index: data.safety_index?.[state1] ? (10 - data.safety_index[state1] * 10) : 0,
          visitor_count: data.visitors_2024?.[state1] || 0,
          top_category: parseArray(data.famous_for?.[state1])[0] || 'General',
          best_month: parseArray(data.best_season?.[state1])[0] || 'Year-round',
          population: data.population?.[state1] || 0,
          literacy_rate: data.literacy_rate?.[state1] || 0,
          gdp: data.gdp_inr_crore?.[state1] || 0,
          area: data.area_km2?.[state1] || 0,
          // Add visitor data for chart
          visitors: {
            2020: data.visitors_2020?.[state1] || 0,
            2021: data.visitors_2021?.[state1] || 0,
            2022: data.visitors_2022?.[state1] || 0,
            2023: data.visitors_2023?.[state1] || 0,
            2024: data.visitors_2024?.[state1] || 0,
            2025: data.visitors_2025?.[state1] || 0
          }
        },
        state2_data: {
          name: state2,
          tourism_growth: parseFloat(state2Growth),
          risk_index: data.safety_index?.[state2] ? (10 - data.safety_index[state2] * 10) : 0,
          visitor_count: data.visitors_2024?.[state2] || 0,
          top_category: parseArray(data.famous_for?.[state2])[0] || 'General',
          best_month: parseArray(data.best_season?.[state2])[0] || 'Year-round',
          population: data.population?.[state2] || 0,
          literacy_rate: data.literacy_rate?.[state2] || 0,
          gdp: data.gdp_inr_crore?.[state2] || 0,
          area: data.area_km2?.[state2] || 0,
          // Add visitor data for chart
          visitors: {
            2020: data.visitors_2020?.[state2] || 0,
            2021: data.visitors_2021?.[state2] || 0,
            2022: data.visitors_2022?.[state2] || 0,
            2023: data.visitors_2023?.[state2] || 0,
            2024: data.visitors_2024?.[state2] || 0,
            2025: data.visitors_2025?.[state2] || 0
          }
        }
      };
      
      setComparisonData({
        type: 'states',
        data: comparisonData
      });
    } catch (err) {
      console.log('Using mock data for state comparison');
      const mockResponse = await mockAiAPI.compareStates(state1, state2);
      console.log('Mock Response:', mockResponse.data);
      setComparisonData({
        type: 'states',
        data: mockResponse.data || {}
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCityCompare = async () => {
    if (!cityState1 || !city1 || !cityState2 || !city2) {
      setError('Please select both cities');
      return;
    }

    setLoading(true);
    setError(null);
    setComparisonData(null);

    try {
      const response = await aiAPI.compareCities(cityState1, city1, cityState2, city2);
      console.log('API Response:', response.data);
      
      // Extract data from backend response format
      const data = response.data;
      const city1Key = `${city1}, ${cityState1}`;
      const city2Key = `${city2}, ${cityState2}`;
      
      // Convert backend response to frontend format
      const comparisonData = {
        state1_data: {
          name: city1,
          state: cityState1,
          tourism_growth: data.tourist_rating?.[city1Key] || 0,
          risk_index: data.risk_index?.[city1Key] || 0,
          top_category: data.category?.[city1Key] || 'General',
          best_month: data.best_time_to_visit?.[city1Key] || 'Year-round'
        },
        state2_data: {
          name: city2,
          state: cityState2,
          tourism_growth: data.tourist_rating?.[city2Key] || 0,
          risk_index: data.risk_index?.[city2Key] || 0,
          top_category: data.category?.[city2Key] || 'General',
          best_month: data.best_time_to_visit?.[city2Key] || 'Year-round'
        }
      };
      
      setComparisonData({
        type: 'cities',
        data: comparisonData
      });
    } catch (err) {
      console.log('Using mock data for city comparison');
      const mockResponse = await mockAiAPI.compareCities(cityState1, city1, cityState2, city2);
      console.log('Mock Response:', mockResponse.data);
      setComparisonData({
        type: 'cities',
        data: mockResponse.data || {}
      });
    } finally {
      setLoading(false);
    }
  };

  const renderComparisonChart = () => {
    if (!comparisonData || !comparisonData.data) return null;

    const { state1_data, state2_data } = comparisonData.data;
    
    // Only show chart for state comparison with visitor data
    if (comparisonData.type !== 'states' || !state1_data.visitors || !state2_data.visitors) {
      return null;
    }

    const years = [2020, 2021, 2022, 2023, 2024, 2025];
    const state1Visitors = years.map(year => state1_data.visitors[year] || 0);
    const state2Visitors = years.map(year => state2_data.visitors[year] || 0);
    
    const maxVisitors = Math.max(...state1Visitors, ...state2Visitors);
    const minVisitors = Math.min(...state1Visitors, ...state2Visitors);
    const range = maxVisitors - minVisitors;

    return (
      <div className="card">
        <div className="card-body">
          <h6 className="card-title">Visitor Trends Comparison (2020-2025)</h6>
          <p className="text-muted small">Annual visitor data comparison between the two states</p>
          
          {/* Bar Chart */}
          <div className="comparison-chart" style={{ height: '200px', padding: '20px 0' }}>
            <div className="d-flex align-items-end justify-content-between" style={{ height: '160px' }}>
              {years.map((year, index) => {
                const state1Height = range > 0 ? ((state1Visitors[index] - minVisitors) / range * 100) : 50;
                const state2Height = range > 0 ? ((state2Visitors[index] - minVisitors) / range * 100) : 50;
                
                return (
                  <div key={year} className="d-flex flex-column align-items-center" style={{ flex: 1, minWidth: '50px' }}>
                    {/* State 1 Bar */}
                    <div
                      className="bar me-1"
                      style={{
                        height: `${state1Height}%`,
                        width: '20px',
                        backgroundColor: '#007bff',
                        borderRadius: '2px 2px 0 0',
                        marginBottom: '4px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      title={`${state1_data.name} ${year}: ${state1Visitors[index].toLocaleString()} visitors`}
                    ></div>
                    
                    {/* State 2 Bar */}
                    <div
                      className="bar"
                      style={{
                        height: `${state2Height}%`,
                        width: '20px',
                        backgroundColor: '#28a745',
                        borderRadius: '2px 2px 0 0',
                        marginBottom: '8px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      title={`${state2_data.name} ${year}: ${state2Visitors[index].toLocaleString()} visitors`}
                    ></div>
                    
                    <div className="text-center">
                      <div className="fw-bold" style={{ fontSize: '0.7rem', color: '#333' }}>
                        {year}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3">
            <div className="d-flex justify-content-center gap-4">
              <div className="d-flex align-items-center">
                <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#007bff', borderRadius: '2px' }}></div>
                <small className="text-muted">{state1_data.name}</small>
              </div>
              <div className="d-flex align-items-center">
                <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '2px' }}></div>
                <small className="text-muted">{state2_data.name}</small>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-4">
            <Row className="g-3">
              <Col md={6}>
                <div className="text-center p-3 bg-light rounded">
                  <div className="fw-bold text-primary">
                    {state1_data.visitors[2025]?.toLocaleString() || 'N/A'}
                  </div>
                  <small className="text-muted">{state1_data.name} - 2025 Visitors</small>
                </div>
              </Col>
              <Col md={6}>
                <div className="text-center p-3 bg-light rounded">
                  <div className="fw-bold text-success">
                    {state2_data.visitors[2025]?.toLocaleString() || 'N/A'}
                  </div>
                  <small className="text-muted">{state2_data.name} - 2025 Visitors</small>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <Container>
          <h1>Compare Destinations</h1>
          <p>Compare states and cities side by side</p>
        </Container>
      </div>

      <Container className="py-5">
        <Row className="mb-5">
          <Col lg={10} className="mx-auto">
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4"
            >
              <Tab eventKey="states" title="State Comparison">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title mb-4">Compare States</h5>
                    <Row className="g-3">
                      <Col md={5}>
                        <Form.Group>
                          <Form.Label>First State</Form.Label>
                          <Form.Select
                            value={state1}
                            onChange={(e) => setState1(e.target.value)}
                            disabled={loading}
                          >
                            <option value="">Choose first state...</option>
                            {Array.isArray(states) && states.map((state, index) => (
                              <option key={index} value={state}>
                                {state}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={2} className="d-flex align-items-end">
                        <div className="text-center w-100">
                          <span className="text-muted">VS</span>
                        </div>
                      </Col>
                      
                      <Col md={5}>
                        <Form.Group>
                          <Form.Label>Second State</Form.Label>
                          <Form.Select
                            value={state2}
                            onChange={(e) => setState2(e.target.value)}
                            disabled={loading}
                          >
                            <option value="">Choose second state...</option>
                            {Array.isArray(states) && states.map((state, index) => (
                              <option key={index} value={state}>
                                {state}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="text-center mt-4">
                      <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleStateCompare}
                        disabled={!state1 || !state2 || loading}
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Comparing...
                          </>
                        ) : (
                          'Compare States'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Tab>

              <Tab eventKey="cities" title="City Comparison">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title mb-4">Compare Cities</h5>
                    <Row className="g-3">
                      <Col md={5}>
                        <Form.Group>
                          <Form.Label>First City</Form.Label>
                          <Form.Select
                            value={cityState1}
                            onChange={(e) => {
                              setCityState1(e.target.value);
                              setCity1('');
                            }}
                            disabled={loading}
                          >
                            <option value="">Choose state...</option>
                            {Array.isArray(states) && states.map((state, index) => (
                              <option key={index} value={state}>
                                {state}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Select
                            value={city1}
                            onChange={(e) => setCity1(e.target.value)}
                            disabled={!cityState1 || loading}
                            className="mt-2"
                          >
                            <option value="">Choose city...</option>
                            {Array.isArray(cities1) && cities1.map((city, index) => (
                              <option key={index} value={city}>
                                {city}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={2} className="d-flex align-items-end">
                        <div className="text-center w-100">
                          <span className="text-muted">VS</span>
                        </div>
                      </Col>
                      
                      <Col md={5}>
                        <Form.Group>
                          <Form.Label>Second City</Form.Label>
                          <Form.Select
                            value={cityState2}
                            onChange={(e) => {
                              setCityState2(e.target.value);
                              setCity2('');
                            }}
                            disabled={loading}
                          >
                            <option value="">Choose state...</option>
                            {Array.isArray(states) && states.map((state, index) => (
                              <option key={index} value={state}>
                                {state}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Select
                            value={city2}
                            onChange={(e) => setCity2(e.target.value)}
                            disabled={!cityState2 || loading}
                            className="mt-2"
                          >
                            <option value="">Choose city...</option>
                            {Array.isArray(cities2) && cities2.map((city, index) => (
                              <option key={index} value={city}>
                                {city}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="text-center mt-4">
                      <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleCityCompare}
                        disabled={!cityState1 || !city1 || !cityState2 || !city2 || loading}
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Comparing...
                          </>
                        ) : (
                          'Compare Cities'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Tab>
            </Tabs>
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

        {/* Comparison Results */}
        {comparisonData && comparisonData.data && (
          <Row className="g-4">
            <Col lg={6}>
              <CompareCard 
                data={comparisonData.data.state1_data || {}}
                title={comparisonData.data.state1_data?.name || 'First Destination'}
                type={activeTab}
              />
            </Col>
            
            <Col lg={6}>
              <CompareCard 
                data={comparisonData.data.state2_data || {}}
                title={comparisonData.data.state2_data?.name || 'Second Destination'}
                type={activeTab}
              />
            </Col>
            
            <Col lg={12}>
              {renderComparisonChart()}
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default Compare;
