import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CategoryDonutChart = ({ data }) => {
  if (!data || !data.category_predictions) {
    return <p className="text-muted">No category data available</p>;
  }

  const categories = Object.keys(data.category_predictions);
  const ratings = categories.map(cat => data.category_predictions[cat].average_tourist_rating);
  
  // Sort by rating descending for better visualization
  const sortedData = categories
    .map((cat, idx) => ({ category: cat, rating: ratings[idx] }))
    .sort((a, b) => b.rating - a.rating);

  const chartData = {
    labels: sortedData.map(item => item.category),
    datasets: [{
      label: 'Tourist Rating',
      data: sortedData.map(item => item.rating),
      backgroundColor: [
        'rgba(63, 81, 181, 0.8)',   // Indigo
        'rgba(3, 169, 244, 0.8)',   // Light Blue
        'rgba(0, 150, 136, 0.8)',   // Teal
        'rgba(76, 175, 80, 0.8)',   // Green
        'rgba(255, 193, 7, 0.8)',   // Amber
        'rgba(255, 87, 34, 0.8)',   // Deep Orange
        'rgba(156, 39, 176, 0.8)',  // Purple
        'rgba(233, 30, 99, 0.8)',   // Pink
      ],
      borderColor: [
        'rgba(63, 81, 181, 1)',
        'rgba(3, 169, 244, 1)',
        'rgba(0, 150, 136, 1)',
        'rgba(76, 175, 80, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(255, 87, 34, 1)',
        'rgba(156, 39, 176, 1)',
        'rgba(233, 30, 99, 1)',
      ],
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  const options = {
    indexAxis: 'y', // Horizontal bar chart
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // Hide legend for cleaner look
      },
      title: {
        display: true,
        text: 'Category-wise Tourist Ratings',
        font: {
          size: 14,
          weight: '600'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: (context) => {
            const value = context.parsed.x.toFixed(1);
            return `Rating: ${value} / 5.0`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: false,
        min: Math.min(...ratings) - 0.3, // Start slightly below minimum
        max: 5.0, // Maximum rating
        ticks: {
          stepSize: 0.5,
          callback: function(value) {
            return value.toFixed(1);
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CategoryDonutChart;
