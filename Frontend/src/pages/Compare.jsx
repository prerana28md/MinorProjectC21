import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { dataAPI, aiAPI, mockDataAPI, mockAiAPI } from '../services/api';
import CompareCard from '../components/CompareCard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Compare = () => {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [stateGraphData, setStateGraphData] = useState(null);

  const [state1, setState1] = useState('');
  const [state2, setState2] = useState('');

  useEffect(() => { fetchStates(); }, []);

  const fetchStates = async () => {
    try {
      const response = await dataAPI.getStates();
      let statesData = response.data;
      if (!Array.isArray(statesData)) {
        statesData = Object.keys(statesData);
      }
      setStates(statesData);
    } catch {
      const mockResponse = await mockDataAPI.getStates();
      setStates(mockResponse.data);
    }
  };

  const handleStateCompare = useCallback(async () => {
    if (!state1 || !state2) {
      setError('Please select both states');
      return;
    }
    setLoading(true);
    setError(null);
    setComparisonData(null);
    setStateGraphData(null);

    try {
      const response = await aiAPI.compareStates(state1, state2);
      const data = response.data;

      const parseArray = arrStr => {
        if (typeof arrStr === 'string') {
          try {
            return JSON.parse(arrStr.replace(/'/g, '"'));
          } catch {
            const matches = arrStr.match(/'([^']+)'/g);
            if (matches) return matches.map(m => m.slice(1, -1));
            return [arrStr];
          }
        }
        return Array.isArray(arrStr) ? arrStr : [arrStr];
      };

      const riskIndex1 = data.safety_index ? (10 - data.safety_index[state1] * 10).toFixed(1) : "0.0";
      const riskIndex2 = data.safety_index ? (10 - data.safety_index[state2] * 10).toFixed(1) : "0.0";

      const compData = {
        state1_data: {
          name: state1,
          tourism_growth:
            data.visitors_2024 && data.visitors_2023 && data.visitors_2023[state1]
              ? (100 * (data.visitors_2024[state1] - data.visitors_2023[state1]) / data.visitors_2023[state1]).toFixed(1)
              : 0,
          risk_index: riskIndex1,
          visitor_count: data.visitors_2024?.[state1] || 0,
          top_category: parseArray(data.famous_for?.[state1])[0] || 'General',
          top_city: data.top_city?.[state1] || '',
          best_month: parseArray(data.best_season?.[state1])[0] || 'Year-round',
          population: data.population?.[state1] || 0,
          literacy_rate: data.literacy_rate?.[state1] || 0,
          gdp: data.gdp_inr_crore?.[state1] || 0,
          area: data.area_km2?.[state1] || 0,
          visitors: {
            2020: data.visitors_2020?.[state1] || 0,
            2021: data.visitors_2021?.[state1] || 0,
            2022: data.visitors_2022?.[state1] || 0,
            2023: data.visitors_2023?.[state1] || 0,
            2024: data.visitors_2024?.[state1] || 0,
            2025: data.visitors_2025?.[state1] || 0,
          },
        },
        state2_data: {
          name: state2,
          tourism_growth:
            data.visitors_2024 && data.visitors_2023 && data.visitors_2023[state2]
              ? (100 * (data.visitors_2024[state2] - data.visitors_2023[state2]) / data.visitors_2023[state2]).toFixed(1)
              : 0,
          risk_index: riskIndex2,
          visitor_count: data.visitors_2024?.[state2] || 0,
          top_category: parseArray(data.famous_for?.[state2])[0] || 'General',
          top_city: data.top_city?.[state2] || '',
          best_month: parseArray(data.best_season?.[state2])[0] || 'Year-round',
          population: data.population?.[state2] || 0,
          literacy_rate: data.literacy_rate?.[state2] || 0,
          gdp: data.gdp_inr_crore?.[state2] || 0,
          area: data.area_km2?.[state2] || 0,
          visitors: {
            2020: data.visitors_2020?.[state2] || 0,
            2021: data.visitors_2021?.[state2] || 0,
            2022: data.visitors_2022?.[state2] || 0,
            2023: data.visitors_2023?.[state2] || 0,
            2024: data.visitors_2024?.[state2] || 0,
            2025: data.visitors_2025?.[state2] || 0,
          },
        },
      };
      setComparisonData({ type: 'states', data: compData });
      setStateGraphData(compData);
    } catch (err) {
      const mockResponse = await mockAiAPI.compareStates(state1, state2);
      setComparisonData({ type: 'states', data: mockResponse.data || {} });
      setStateGraphData(mockResponse.data || {});
    } finally {
      setLoading(false);
    }
  }, [state1, state2]);

  const renderComparisonLineChart = useCallback((graphData) => {
    if (!graphData || !graphData.state1_data?.visitors || !graphData.state2_data?.visitors) return null;
    const { state1_data, state2_data } = graphData;
    const years = [2020, 2021, 2022, 2023, 2024, 2025];
    const state1Visitors = years.map(year => Number(state1_data.visitors[year] || 0));
    const state2Visitors = years.map(year => Number(state2_data.visitors[year] || 0));
    const data = {
      labels: years.map(String),
      datasets: [
        {
          label: state1_data.name,
          data: state1Visitors,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0,123,255,0.05)',
          tension: 0.3,
          fill: true,
        },
        {
          label: state2_data.name,
          data: state2Visitors,
          borderColor: '#28a745',
          backgroundColor: 'rgba(40,167,69,0.05)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Visitor Trends Comparison (2020-2025)' },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => (v >= 1000 ? v.toLocaleString() : v) },
        },
      },
    };
    return (
      <div style={{ width: "100%", height: 340, marginTop: 30 }}>
        <Line data={data} options={options} />
      </div>
    );
  }, []);

  return (
    <Container className="py-5">
      <h1 className="mb-4">Compare States</h1>
      <Row className="mb-4">
        <Col md={5}>
          <Form.Group>
            <Form.Label>First State</Form.Label>
            <Form.Select value={state1} onChange={e => setState1(e.target.value)} disabled={loading}>
              <option value="">Select first state...</option>
              {states.map((state, idx) => (
                <option key={idx} value={state}>{state}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={2} className="d-flex align-items-center justify-content-center">
          <div>VS</div>
        </Col>
        <Col md={5}>
          <Form.Group>
            <Form.Label>Second State</Form.Label>
            <Form.Select value={state2} onChange={e => setState2(e.target.value)} disabled={loading}>
              <option value="">Select second state...</option>
              {states.map((state, idx) => (
                <option key={idx} value={state}>{state}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <div className="text-center mb-4">
        <Button onClick={handleStateCompare} disabled={!state1 || !state2 || loading}>
          {loading ? 'Comparing...' : 'Compare'}
        </Button>
      </div>
      {error && (
        <Alert variant="danger" className="mb-4">{error}</Alert>
      )}
      {comparisonData && comparisonData.data && (
        <>
          <Row className="g-4">
            <Col md={6}>
              <CompareCard data={comparisonData.data.state1_data} title={comparisonData.data.state1_data.name}>
                {comparisonData.data.state1_data.top_category && (
                  <div className="mt-2 d-flex justify-content-between text-muted fst-italic small">
                    <span>Top Category: {comparisonData.data.state1_data.top_category}</span>
                    {comparisonData.data.state1_data.top_city && (
                      <span>Top City: {comparisonData.data.state1_data.top_city}</span>
                    )}
                  </div>
                )}
              </CompareCard>
            </Col>
            <Col md={6}>
              <CompareCard data={comparisonData.data.state2_data} title={comparisonData.data.state2_data.name}>
                {comparisonData.data.state2_data.top_category && (
                  <div className="mt-2 d-flex justify-content-between text-muted fst-italic small">
                    <span>Top Category: {comparisonData.data.state2_data.top_category}</span>
                    {comparisonData.data.state2_data.top_city && (
                      <span>Top City: {comparisonData.data.state2_data.top_city}</span>
                    )}
                  </div>
                )}
              </CompareCard>
            </Col>
          </Row>
          <Row>
            <Col>
              {stateGraphData && renderComparisonLineChart(stateGraphData)}
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default Compare;
