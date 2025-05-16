import Cookies from 'js-cookie';

/**
 * Checks if the JWT token is expired
 * @returns {boolean} True if the token is expired or invalid, false otherwise
 */
export const isTokenExpired = (): boolean => {
  try {
    const token = Cookies.get('access_token');
    if (!token) return true;
    
    // JWT tokens are in format: header.payload.signature
    // We need to decode the payload (middle part)
    const payload = token.split('.')[1];
    if (!payload) return true;
    
    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payload));
    
    // Check if the token has an expiration claim
    if (!decodedPayload.exp) return false;
    
    // Compare expiration time with current time (exp is in seconds, Date.now() is in milliseconds)
    const expirationTime = decodedPayload.exp * 1000;
    return Date.now() >= expirationTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    // If we can't verify, assume expired for security
    return true;
  }
};

/**
 * Gets the remaining time in seconds until the token expires
 * @returns {number} Seconds until expiration, or 0 if token is invalid or expired
 */
export const getTokenRemainingTime = (): number => {
  try {
    const token = Cookies.get('access_token');
    if (!token) return 0;
    
    const payload = token.split('.')[1];
    if (!payload) return 0;
    
    const decodedPayload = JSON.parse(atob(payload));
    
    if (!decodedPayload.exp) return Infinity; // If no expiration is set
    
    const expirationTime = decodedPayload.exp * 1000;
    const remainingTime = expirationTime - Date.now();
    
    return Math.max(0, Math.floor(remainingTime / 1000)); // Return seconds
  } catch (error) {
    console.error('Error getting token remaining time:', error);
    return 0;
  }
}; 