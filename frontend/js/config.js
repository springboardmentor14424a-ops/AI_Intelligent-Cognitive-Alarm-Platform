window.API_BASE_URL =
    typeof getApiBaseUrl === 'function'
        ? getApiBaseUrl()
        : 'http://127.0.0.1:8000';