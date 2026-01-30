/**
 * Configurações globais da aplicação frontend.
 * Centraliza a definição da URL base da API.
 */
export const API_BASE_URL = window.location.hostname.includes("onrender.com")
    ? "https://gus-q7nn.onrender.com"
    : `http://${window.location.hostname}:3000`;