class EnvironmentConfig {
  constructor() {
    this.env = import.meta.env.MODE || 'development';
    this.isProduction = this.env === 'production';
    this.isDevelopment = this.env === 'development';
    this.isLocal = this.isDevelopment || 
      (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
      (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') ||
      (typeof window !== 'undefined' && window.location.port === '5173'); // Vite default port

    this.config = {
      API_URL: this.getEnvVar('VITE_API_URL') || 'https://c.d0s369.co.in',
      FRONTEND_URL: this.getEnvVar('VITE_FRONTEND_URL') || 'https://chat.d0s369.co.in',
      SOCKET_URL: this.getEnvVar('VITE_SOCKET_URL') || 'https://c.d0s369.co.in',
      DEBUG_MODE: this.getEnvVar('VITE_DEBUG_MODE') === 'true',
      LOG_LEVEL: this.getEnvVar('VITE_LOG_LEVEL') || 'info',
      APP_NAME: this.getEnvVar('VITE_APP_NAME') || 'RAMA Chat',
      APP_VERSION: this.getEnvVar('VITE_APP_VERSION') || '1.0.0'
    };

    console.log('🌍 Environment Detection:', {
      env: this.env,
      isProduction: this.isProduction,
      isDevelopment: this.isDevelopment,
      isLocal: this.isLocal,
      importMetaEnv: import.meta.env
    });
  }

  getEnvVar(key) {
    return import.meta.env[key];
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return { ...this.config };
  }

  getApiUrl(path = '') {
    const baseUrl = this.config.API_URL;
    const apiPath = path.startsWith('/api') ? path : `/api${path}`;
    return `${baseUrl}${apiPath}`;
  }

  isProd() {
    return this.isProduction;
  }

  isDev() {
    return this.isDevelopment;
  }

  isLocalEnv() {
    return this.isLocal;
  }
}

export default new EnvironmentConfig();