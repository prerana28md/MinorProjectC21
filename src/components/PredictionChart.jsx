import React from 'react';
import { Card } from 'react-bootstrap';

const PredictionChart = ({ data, title, selectedCategory }) => {
  if (!data || !data.historical_data || !data.future_predictions) {
    return (
      <Card>
        <Card.Body>
          <h6 className="card-title">{title}</h6>
          <p className="text-muted">No prediction data available</p>
        </Card.Body>
      </Card>
    );
  }

  const { historical_data, future_predictions } = data;
  
  // Combine historical and future data
  const allData = [...historical_data, ...future_predictions];
  const maxVisitors = Math.max(...allData.map(d => d.visitors));
  const minVisitors = Math.min(...allData.map(d => d.visitors));
  const range = maxVisitors - minVisitors;

  // Calculate growth rate
  const latestHistorical = historical_data[historical_data.length - 1];
  const firstFuture = future_predictions[0];
  const growthRate = latestHistorical ? 
    ((firstFuture.visitors - latestHistorical.visitors) / latestHistorical.visitors * 100).toFixed(1) : 0;

  return (
    <Card>
      <Card.Body>
        <h6 className="card-title">{title}</h6>
        <div className="mb-3">
          <small className="text-muted">
            {selectedCategory ? `Category: ${selectedCategory}` : 'Overall Tourism Trends'}
          </small>
          <div className="mt-1">
            <span className={`badge ${growthRate >= 0 ? 'bg-success' : 'bg-danger'}`}>
              {growthRate >= 0 ? '↗' : '↘'} {Math.abs(growthRate)}% predicted growth
            </span>
          </div>
        </div>

        {/* Enhanced bar chart for all years 2020-2028 */}
        <div className="prediction-chart d-flex align-items-end justify-content-between" style={{ height: '160px', gap: '4px', padding: '10px 0' }}>
          {allData.map((item, index) => {
            const isFuture = index >= historical_data.length;
            const height = range > 0 ? ((item.visitors - minVisitors) / range * 100) : 50;
            
            return (
              <div key={item.year} className="d-flex flex-column align-items-center" style={{ flex: 1, minWidth: '40px' }}>
                <div
                  className={`bar ${isFuture ? 'future-bar' : 'historical-bar'}`}
                  style={{
                    height: `${height}%`,
                    width: '100%',
                    maxWidth: '35px',
                    backgroundColor: isFuture ? '#28a745' : '#007bff',
                    borderRadius: '3px 3px 0 0',
                    marginBottom: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: isFuture ? '0 2px 4px rgba(40, 167, 69, 0.3)' : '0 2px 4px rgba(0, 123, 255, 0.3)',
                    cursor: 'pointer'
                  }}
                  title={`${item.year}: ${item.visitors.toLocaleString()} visitors`}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                ></div>
                <div className="text-center">
                  <div className="fw-bold" style={{ fontSize: '0.7rem', color: isFuture ? '#28a745' : '#007bff' }}>
                    {item.year}
                  </div>
                  <div className="fw-bold" style={{ fontSize: '0.6rem', color: '#666' }}>
                    {item.visitors.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <div className="d-flex justify-content-between">
            <small className="text-primary">
              <span className="bar-legend me-2" style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#007bff' }}></span>
              Historical Data
            </small>
            <small className="text-success">
              <span className="bar-legend me-2" style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#28a745' }}></span>
              Future Predictions
            </small>
          </div>
        </div>

        {/* Key insights */}
        <div className="mt-3">
          <h6 className="small">Key Insights:</h6>
          <ul className="small list-unstyled mb-0">
            <li>• Peak year: {allData.reduce((max, item) => item.visitors > max.visitors ? item : max).year}</li>
            <li>• Total visitors (2024): {latestHistorical?.visitors.toLocaleString() || 'N/A'}</li>
            <li>• Predicted (2026): {future_predictions[0]?.visitors.toLocaleString() || 'N/A'}</li>
          </ul>
        </div>
      </Card.Body>
    </Card>
  );
};

export default PredictionChart;
