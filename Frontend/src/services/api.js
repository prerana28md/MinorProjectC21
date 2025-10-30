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

// Helper to create a mock city object for consistency
const createMockCity = (cityName, stateName) => ({
  city_name: cityName,
  state_name: stateName,
  description: `A beautiful and popular tourist destination in ${stateName}, known for its rich history and scenic views.`,
  category: ['Heritage', 'Beach', 'Hill Station', 'Spiritual', 'Adventure'][Math.floor(Math.random() * 5)],
  tourist_rating: (Math.random() * 1.5 + 3.5).toFixed(1), // Random rating between 3.5 and 5.0
  risk_index: (Math.random() * 4).toFixed(1), // Random risk between 0.0 and 4.0
  best_time_to_visit: ['October to March', 'April to June', 'July to September'][Math.floor(Math.random() * 3)],
  top_attractions: 'Historic sites, Scenic views, Local cuisine, Shopping areas'
});

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
      'Andhra Pradesh': ['Tirupati', 'Visakhapatnam', 'Araku Valley', 'Vijayawada', 'Amaravati', 'Srisailam', 'Lepakshi', 'Kurnool', 'Horsley Hills', 'Nellore'],
  
      'Arunachal Pradesh': ['Tawang', 'Ziro Valley', 'Itanagar', 'Bomdila', 'Namdapha National Park', 'Roing', 'Mechuka', 'Pasighat', 'Dirang', 'Bhalukpong'],
  
      'Assam': ['Guwahati', 'Kaziranga National Park', 'Majuli Island', 'Sivasagar', 'Tezpur', 'Jorhat', 'Manas National Park', 'Haflong', 'Hajo', 'Dibrugarh'],
  
      'Bihar': ['Patna', 'Bodh Gaya', 'Nalanda', 'Rajgir', 'Vaishali', 'Vikramshila', 'Pawapuri', 'Kesaria Stupa', 'Sasaram', 'Gaya'],
  
      'Chhattisgarh': ['Raipur', 'Jagdalpur', 'Chitrakote Falls', 'Bastar', 'Sirpur', 'Kanger Valley National Park', 'Mainpat', 'Dandami Luxury Resort', 'Barnawapara Wildlife Sanctuary', 'Tirathgarh Falls'],
  
      'Goa': ['Panaji', 'Calangute'],
  
      'Gujarat': ['Ahmedabad', 'Rann of Kutch'],
  
      'Haryana': ['Kurukshetra'],
  
      'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Dalhousie', 'Kullu', 'Spiti Valley', 'Chamba', 'Kasol', 'McLeod Ganj', 'Solang Valley'],
  
      'Jharkhand': ['Ranchi', 'Netarhat', 'Betla National Park', 'Hazaribagh', 'Deoghar', 'Patratu Valley', 'Dassam Falls', 'Hundru Falls', 'Giridih', 'Jamshedpur'],
  
      'Karnataka': ['Bengaluru', 'Mysuru', 'Hampi', 'Coorg', 'Chikmagalur', 'Gokarna', 'Badami', 'Udupi', 'Jog Falls', 'Bijapur'],
  
      'Kerala': ['Kochi', 'Munnar', 'Alleppey', 'Thekkady', 'Wayanad', 'Kovalam', 'Varkala', 'Thrissur', 'Kumarakom', 'Bekal Fort'],
  
      'Madhya Pradesh': ['Bhopal', 'Indore', 'Khajuraho', 'Gwalior', 'Orchha', 'Sanchi', 'Pachmarhi', 'Kanha National Park', 'Ujjain', 'Jabalpur'],
  
      'Maharashtra': ['Mumbai', 'Pune', 'Aurangabad', 'Lonavala', 'Mahabaleshwar', 'Nashik', 'Shirdi', 'Alibaug', 'Kolhapur', 'Nagpur'],
  
      'Manipur': ['Imphal', 'Loktak Lake', 'Keibul Lamjao National Park', 'Kangla Fort', 'Moreh', 'Thoubal', 'Andro Village', 'Bishnupur', 'Ukhrul', 'Sendra Island'],
  
      'Meghalaya': ['Shillong', 'Cherrapunji', 'Dawki', 'Mawlynnong', 'Jowai', 'Nongriat', 'Tura', 'Mawsynram', 'Laitlum Canyons', 'Balpakram National Park'],
  
      'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Reiek', 'Phawngpui Peak', 'Serchhip', 'Tamdil Lake', 'Murlen National Park', 'Dampa Tiger Reserve', 'Thenzawl'],
  
      'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Mon', 'Tuophema', 'Wokha', 'Khonoma Village', 'Dzukou Valley', 'Longleng', 'Phek'],
  
      'Odisha': ['Bhubaneswar', 'Puri', 'Konark', 'Chilika Lake', 'Cuttack', 'Raghurajpur', 'Simlipal National Park', 'Daringbadi', 'Berhampur', 'Udayagiri'],
  
      'Punjab': ['Amritsar', 'Chandigarh', 'Ludhiana', 'Jalandhar', 'Anandpur Sahib', 'Patiala', 'Kapurthala', 'Wagah Border', 'Tarn Taran Sahib'],
  
      'Rajasthan': ['Jaipur', 'Udaipur', 'Jaisalmer', 'Jodhpur', 'Mount Abu', 'Pushkar', 'Ajmer', 'Bikaner', 'Chittorgarh', 'Ranthambore'],
  
      'Sikkim': ['Gangtok', 'Pelling', 'Lachung', 'Yumthang Valley', 'Zuluk', 'Namchi', 'Ravangla', 'Tsomgo Lake', 'Gurudongmar Lake', 'Yuksom'],
  
      'Tamil Nadu': ['Chennai', 'Madurai', 'Ooty', 'Kodaikanal', 'Rameswaram', 'Kanchipuram', 'Thanjavur', 'Coimbatore', 'Tiruchirappalli', 'Yelagiri'],
  
      'Telangana': ['Hyderabad', 'Warangal', 'Nagarjuna Sagar', 'Khammam', 'Adilabad', 'Karimnagar', 'Nizamabad', 'Medak', 'Mahbubnagar', 'Suryapet'],
  
      'Tripura': ['Agartala', 'Udaipur', 'Unakoti', 'Jampui Hills', 'Neermahal Palace', 'Sepahijala Wildlife Sanctuary', 'Pilak', 'Deotamura', 'Dumbur Lake', 'Melaghar'],
  
      'Uttar Pradesh': ['Agra', 'Varanasi', 'Lucknow', 'Prayagraj', 'Mathura', 'Vrindavan', 'Ayodhya', 'Jhansi', 'Sarnath', 'Noida'],
  
      'Uttarakhand': ['Dehradun', 'Nainital', 'Haridwar', 'Rishikesh', 'Mussoorie', 'Auli', 'Jim Corbett National Park', 'Badrinath', 'Kedarnath', 'Almora'],
  
      'West Bengal': ['Kolkata', 'Darjeeling', 'Sundarbans', 'Kalimpong', 'Digha', 'Murshidabad', 'Shantiniketan', 'Bankura', 'Mirik', 'Cooch Behar']
  };

    const cityNames = citiesByState[stateName];
    if (Array.isArray(cityNames) && cityNames.length > 0) {
      const cityObjects = cityNames.map(name => createMockCity(name, stateName));
      return Promise.resolve({ data: cityObjects });
    }

    // Fallback: synthesize 5 placeholder city objects for any unknown state
    const fallback = Array.from({ length: 5 }, (_, i) => createMockCity(`${stateName} City ${i + 1}`, stateName));
    return Promise.resolve({ data: fallback });
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
    data: createMockCity(cityName, stateName)
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
  compareStates: (state1, state2) => {
    const makeStateData = (name) => {
      const tourism_growth = Math.floor(Math.random() * 20) + 5; // percent
      const risk_index = Math.floor(Math.random() * 10) + 1;
      const visitor_count_2024 = Math.floor(Math.random() * 5000000) + 1000000;

      // Generate visitor series 2020-2025 ending at 2024 visitor_count
      const v2024 = visitor_count_2024;
      const v2023 = Math.floor(v2024 / (1 + (Math.random() * 0.15 + 0.05))); // 5%-20% lower
      const v2022 = Math.floor(v2023 / (1 + (Math.random() * 0.15 + 0.05)));
      const v2021 = Math.floor(v2022 / (1 + (Math.random() * 0.15 + 0.05)));
      const v2020 = Math.floor(v2021 / (1 + (Math.random() * 0.15 + 0.05)));
      const v2025 = Math.floor(v2024 * (1 + tourism_growth / 100));

      return {
        name,
        tourism_growth,
        risk_index,
        visitor_count: visitor_count_2024,
        top_category: ['Hill Station', 'Beach', 'Heritage', 'Adventure', 'Spiritual'][Math.floor(Math.random() * 5)],
        best_month: ['January', 'February', 'March', 'October', 'November', 'December'][Math.floor(Math.random() * 6)],
        visitors: {
          2020: v2020,
          2021: v2021,
          2022: v2022,
          2023: v2023,
          2024: v2024,
          2025: v2025,
        },
      };
    };

    return Promise.resolve({
      data: {
        state1_data: makeStateData(state1),
        state2_data: makeStateData(state2),
      },
    });
  },
  
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