import React from 'react';
import { Card } from 'react-bootstrap';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const RiskChart = ({ data, title = "Risk Analysis" }) => {
  if (!data || !data.risks) {
    return (
      <Card className="h-100">
        <Card.Body>
          <h6 className="card-title">{title}</h6>
          <p className="text-muted">No risk data available</p>
        </Card.Body>
      </Card>
    );
  }

  const riskData = data.risks.map(risk => ({
    label: risk.type || risk.category || risk.name,
    value: risk.level || risk.score || risk.value,
    color: getRiskColor(risk.type || risk.category || risk.name)
  }));

  const chartData = {
    labels: riskData.map(item => item.label),
    datasets: [
      {
        data: riskData.map(item => item.value),
        backgroundColor: riskData.map(item => item.color),
        borderColor: '#fff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverBorderColor: '#004AAD',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: '600',
        },
        color: '#333',
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#004AAD',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <Card className="h-100">
      <Card.Body>
        <div className="chart-container">
          <Pie data={chartData} options={options} />
        </div>
      </Card.Body>
    </Card>
  );
};

const getRiskColor = (riskType) => {
  const type = riskType.toLowerCase();
  if (type.includes('flood') || type.includes('water')) {
    return '#17a2b8'; // Info blue
  } else if (type.includes('earthquake') || type.includes('seismic')) {
    return '#dc3545'; // Danger red
  } else if (type.includes('cyclone') || type.includes('storm')) {
    return '#6f42c1'; // Purple
  } else if (type.includes('drought')) {
    return '#fd7e14'; // Orange
  } else if (type.includes('landslide')) {
    return '#6c757d'; // Gray
  } else if (type.includes('fire') || type.includes('wildfire')) {
    return '#ffc107'; // Warning yellow
  } else if (type.includes('safety') || type.includes('security')) {
    return '#28a745'; // Success green
  } else {
    return '#004AAD'; // Primary blue
  }
};

export default RiskChart;
