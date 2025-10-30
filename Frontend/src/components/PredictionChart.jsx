import React from 'react';
import { Card } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
  const allData = [...historical_data, ...future_predictions];

  const labels = allData.map(d => d.year);
  const values = allData.map(d => Number(d.visitors || 0));
  const isFutureIndex = (index) => index >= historical_data.length;

  const backgroundColors = values.map((v, idx) => isFutureIndex(idx) ? 'rgba(40,167,69,0.8)' : 'rgba(0,123,255,0.8)');

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Visitors',
        data: values,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 1,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    }
  };

  const latestHistorical = historical_data[historical_data.length - 1];
  const firstFuture = future_predictions[0];
  const growthRate = latestHistorical ? 
    ((Number(firstFuture.visitors) - Number(latestHistorical.visitors)) / Number(latestHistorical.visitors) * 100).toFixed(1) : 0;

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

        <div style={{ height: 260 }}>
          <Bar data={chartData} options={options} />
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

        <div className="mt-3">
          <h6 className="small">Key Insights:</h6>
          <ul className="small list-unstyled mb-0">
            <li>• Peak year: {allData.reduce((max, item) => item.visitors > max.visitors ? item : max).year}</li>
            <li>• Total visitors (2024): {latestHistorical?.visitors?.toLocaleString() || 'N/A'}</li>
            <li>• Predicted (2026): {future_predictions[0]?.visitors?.toLocaleString() || 'N/A'}</li>
          </ul>
        </div>
      </Card.Body>
    </Card>
  );
};

export default PredictionChart;
