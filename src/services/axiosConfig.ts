import axios from 'axios';

// Créer une instance axios avec la configuration de base
const axiosInstance = axios.create();

// Intercepteur pour les requêtes
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('🚀 Requête sortante:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('❌ Erreur de requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Réponse reçue:', {
      status: response.status,
      headers: response.headers,
      data: response.data instanceof Blob ? 'Blob Audio' : response.data
    });
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ Erreur de réponse:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('❌ Pas de réponse:', error.request);
    } else {
      console.error('❌ Erreur:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
