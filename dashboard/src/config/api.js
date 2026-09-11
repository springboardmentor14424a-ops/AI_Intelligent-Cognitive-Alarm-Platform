export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('cogniwell_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
