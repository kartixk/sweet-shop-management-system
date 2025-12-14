import axios from "axios";

// Detect if we're running on localhost or network
const getBaseURL = () => {
  // If running on localhost, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return "http://localhost:4000/api";
  }
  // If accessing from network, use the same host IP
  return `http://${window.location.hostname}:4000/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;