import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://127.0.0.1:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  register: (userData) => api.post('/register', userData),
  login: (credentials) => api.post('/login', credentials),
  getUserInterests: (username) => api.get(`/user/${username}/interests`),
  updateUserInterests: (username, interests) => api.post(`/user/${username}/interests`, interests),
};

// Data APIs
export const dataAPI = {
  getStates: () => api.get('/states'),
  getStateDetails: (stateName) => api.get(`/states/${stateName}`),
  getStateCities: (stateName) => api.get(`/states/${stateName}/cities`),
  getStateRisk: (stateName) => api.get(`/states/${stateName}/risk`),
  getStateTourismTrends: (stateName) => api.get(`/states/${stateName}/tourism_trends`),
  getCityDetails: (stateName, cityName) => api.get(`/states/${stateName}/cities/${cityName}`),
    // Get interests from the dedicated /interests endpoint
    getInterests: () => api.get('/interests'),
  getPredictTrends: (stateName) => api.get(`/predict_trend/${stateName}`),
  getPredictTrendsByCategory: (stateName, category) => api.get(`/predict_trend/${stateName}/${category}`),
};

// Mock data for development (when backend is not available)
export const mockDataAPI = {
  getStates: () => Promise.resolve({
    data: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
    ]
  }),
  
  getStateCities: (stateName) => {
    const citiesByState = {
      'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur'],
      'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga'],
      'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'],
      'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar'],
      'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer'],
      'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 'Allahabad'],
      'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman'],
      'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar'],
      'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Palakkad', 'Kollam'],
      'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda']
    };
    
    return Promise.resolve({
      data: citiesByState[stateName] || ['No cities available']
    });
  },
  
  getStateDetails: (stateName) => Promise.resolve({
    data: {
      name: stateName,
      capital: 'Capital City',
      population: Math.floor(Math.random() * 50000000) + 10000000,
      best_month: ['January', 'February', 'March', 'October', 'November', 'December'][Math.floor(Math.random() * 6)],
      top_category: ['Hill Station', 'Beach', 'Heritage', 'Adventure', 'Spiritual'][Math.floor(Math.random() * 5)]
    }
  }),
  
  getStateRisk: (stateName) => Promise.resolve({
    data: {
      risks: [
        { type: 'Flood', level: Math.floor(Math.random() * 5) + 1 },
        { type: 'Earthquake', level: Math.floor(Math.random() * 5) + 1 },
        { type: 'Cyclone', level: Math.floor(Math.random() * 5) + 1 },
        { type: 'Drought', level: Math.floor(Math.random() * 5) + 1 },
        { type: 'Landslide', level: Math.floor(Math.random() * 5) + 1 }
      ]
    }
  }),
  
  getStateTourismTrends: (stateName) => Promise.resolve({
    data: {
      trends: [
        { year: '2019', arrivals: Math.floor(Math.random() * 1000000) + 500000 },
        { year: '2020', arrivals: Math.floor(Math.random() * 800000) + 300000 },
        { year: '2021', arrivals: Math.floor(Math.random() * 1200000) + 600000 },
        { year: '2022', arrivals: Math.floor(Math.random() * 1500000) + 800000 },
        { year: '2023', arrivals: Math.floor(Math.random() * 1800000) + 1000000 }
      ]
    }
  }),
  
  getCityDetails: (stateName, cityName) => Promise.resolve({
    data: {
      name: cityName,
      state: stateName,
      population: Math.floor(Math.random() * 5000000) + 100000,
      best_month: ['January', 'February', 'March', 'October', 'November', 'December'][Math.floor(Math.random() * 6)],
      top_category: ['Hill Station', 'Beach', 'Heritage', 'Adventure', 'Spiritual'][Math.floor(Math.random() * 5)],
      attractions: ['Temple', 'Museum', 'Park', 'Market', 'Monument'].slice(0, Math.floor(Math.random() * 3) + 2)
    }
  })
};

// AI & Comparison APIs
export const aiAPI = {
  getRecommendations: (params) => api.get('/recommend', { params }),
  postRecommendations: (data) => api.post('/recommend', data),
  compareStates: (state1, state2) => api.get(`/compare/states?state1=${state1}&state2=${state2}`),
  compareCities: (state1, city1, state2, city2) => 
    api.get(`/compare/cities?state1=${state1}&city1=${city1}&state2=${state2}&city2=${city2}`),
};

// Mock AI & Comparison APIs
export const mockAiAPI = {
  compareStates: (state1, state2) => Promise.resolve({
    data: {
      state1_data: {
        name: state1,
        tourism_growth: Math.floor(Math.random() * 20) + 5,
        risk_index: Math.floor(Math.random() * 10) + 1,
        visitor_count: Math.floor(Math.random() * 5000000) + 1000000,
        top_category: ['Hill Station', 'Beach', 'Heritage', 'Adventure', 'Spiritual'][Math.floor(Math.random() * 5)],
        best_month: ['January', 'February', 'March', 'October', 'November', 'December'][Math.floor(Math.random() * 6)]
      },
      state2_data: {
        name: state2,
        tourism_growth: Math.floor(Math.random() * 20) + 5,
        risk_index: Math.floor(Math.random() * 10) + 1,
        visitor_count: Math.floor(Math.random() * 5000000) + 1000000,
        top_category: ['Hill Station', 'Beach', 'Heritage', 'Adventure', 'Spiritual'][Math.floor(Math.random() * 5)],
        best_month: ['January', 'February', 'March', 'October', 'November', 'December'][Math.floor(Math.random() * 6)]
      }
    }
  }),
  
  compareCities: (state1, city1, state2, city2) => Promise.resolve({
    data: {
      state1_data: {
        name: city1,
        state: state1,
        tourism_growth: Math.floor(Math.random() * 20) + 5,
        risk_index: Math.floor(Math.random() * 10) + 1,
        visitor_count: Math.floor(Math.random() * 1000000) + 100000,
        top_category: ['Hill Station', 'Beach', 'Heritage', 'Adventure', 'Spiritual'][Math.floor(Math.random() * 5)],
        best_month: ['January', 'February', 'March', 'October', 'November', 'December'][Math.floor(Math.random() * 6)]
      },
      state2_data: {
        name: city2,
        state: state2,
        tourism_growth: Math.floor(Math.random() * 20) + 5,
        risk_index: Math.floor(Math.random() * 10) + 1,
        visitor_count: Math.floor(Math.random() * 1000000) + 100000,
        top_category: ['Hill Station', 'Beach', 'Heritage', 'Adventure', 'Spiritual'][Math.floor(Math.random() * 5)],
        best_month: ['January', 'February', 'March', 'October', 'November', 'December'][Math.floor(Math.random() * 6)]
      }
    }
  }),
  
  getRecommendations: (params) => Promise.resolve({
    data: {
      recommendations: [
        {
          state: 'Kerala',
          city: 'Kochi',
          rating: 4.5,
          risk_index: 3,
          best_month: 'December',
          category: 'Beach'
        },
        {
          state: 'Himachal Pradesh',
          city: 'Shimla',
          rating: 4.3,
          risk_index: 2,
          best_month: 'May',
          category: 'Hill Station'
        },
        {
          state: 'Rajasthan',
          city: 'Jaipur',
          rating: 4.2,
          risk_index: 4,
          best_month: 'October',
          category: 'Heritage'
        }
      ]
    }
  })
};

// Weather APIs
export const weatherAPI = {
  getCityWeather: (cityName) => api.get(`/weather/city/${cityName}`),
  getStateWeather: (stateName) => api.get(`/weather/state/${stateName}`),
};

export default api;
