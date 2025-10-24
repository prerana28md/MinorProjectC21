import React from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';

const CompareCard = ({ data, title, type = "state" }) => {
  if (!data || typeof data !== 'object') {
    return (
      <Card className="h-100">
        <Card.Body>
          <h6 className="card-title">{title}</h6>
          <p className="text-muted">No comparison data available</p>
        </Card.Body>
      </Card>
    );
  }

  const getRiskLevel = (riskIndex) => {
    if (riskIndex <= 2) return { level: 'Low', variant: 'success' };
    if (riskIndex <= 4) return { level: 'Medium', variant: 'warning' };
    return { level: 'High', variant: 'danger' };
  };

  const getGrowthTrend = (growth) => {
    if (growth > 10) return { trend: 'Excellent', variant: 'success' };
    if (growth > 5) return { trend: 'Good', variant: 'info' };
    if (growth > 0) return { trend: 'Stable', variant: 'warning' };
    return { trend: 'Declining', variant: 'danger' };
  };

  const riskInfo = getRiskLevel(data?.risk_index || data?.risk || 0);
  const growthInfo = getGrowthTrend(data?.tourism_growth || data?.growth || 0);

  return (
    <Card className="h-100">
      <Card.Body>
        <div className="text-center mb-3">
          <h5 className="card-title text-primary">{title}</h5>
          {type === 'city' && data?.state && (
            <small className="text-muted">{data.state}</small>
          )}
        </div>

        <Row className="g-3">
          <Col xs={6}>
            <div className="text-center">
              <div className="fs-4 fw-bold text-primary">
                {data?.tourism_growth || data?.growth || 0}%
              </div>
              <small className="text-muted">Tourism Growth</small>
              <div className="mt-1">
                <Badge bg={growthInfo.variant} className="small">
                  {growthInfo.trend}
                </Badge>
              </div>
            </div>
          </Col>
          
          <Col xs={6}>
            <div className="text-center">
              <div className="fs-4 fw-bold text-warning">
                {data?.risk_index || data?.risk || 0}/10
              </div>
              <small className="text-muted">Risk Index</small>
              <div className="mt-1">
                <Badge bg={riskInfo.variant} className="small">
                  {riskInfo.level}
                </Badge>
              </div>
            </div>
          </Col>
          
          <Col xs={12}>
            <div className="text-center">
              <div className="fs-5 fw-bold text-info">
                {data?.top_category || data?.category || 'General'}
              </div>
              <small className="text-muted">Top Category</small>
            </div>
          </Col>
          
          <Col xs={12}>
            <div className="text-center">
              <div className="fs-5 fw-bold text-success">
                {data?.best_month || data?.month || 'Year-round'}
              </div>
              <small className="text-muted">Best Travel Month</small>
            </div>
          </Col>
        </Row>

        {data?.visitor_count && (
          <div className="mt-3 pt-3 border-top">
            <div className="text-center">
              <div className="fs-6 fw-bold text-dark">
                {data.visitor_count.toLocaleString()}
              </div>
              <small className="text-muted">Annual Visitors (2024)</small>
            </div>
          </div>
        )}

        {/* Additional state information */}
        {data?.population && (
          <div className="mt-2">
            <div className="row g-2 text-center">
              {data.population && (
                <div className="col-6">
                  <div className="fw-bold text-primary">
                    {data.population.toLocaleString()}
                  </div>
                  <small className="text-muted">Population</small>
                </div>
              )}
              {data.literacy_rate && (
                <div className="col-6">
                  <div className="fw-bold text-success">
                    {data.literacy_rate}%
                  </div>
                  <small className="text-muted">Literacy Rate</small>
                </div>
              )}
            </div>
          </div>
        )}

        {data?.attractions && data.attractions.length > 0 && (
          <div className="mt-3">
            <small className="text-muted d-block mb-2">Key Attractions:</small>
            <div className="d-flex flex-wrap gap-1">
              {data.attractions.slice(0, 3).map((attraction, index) => (
                <Badge key={index} bg="light" text="dark" className="small">
                  {attraction}
                </Badge>
              ))}
              {data.attractions.length > 3 && (
                <Badge bg="light" text="dark" className="small">
                  +{data.attractions.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default CompareCard;
