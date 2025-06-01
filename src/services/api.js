// API service for backend communication

// Change to direct backend URL instead of relying on proxy
const API_BASE_URL = 'http://localhost:8082';

class ApiService {
  // Helper method for making HTTP requests with retry logic
  async makeRequest(endpoint, options = {}, retryCount = 0) {
    const maxRetries = 2;
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`%c[API] ${config.method || 'GET'} ${url}`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 2px;');
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData = { 
          status: response.status,
          statusText: response.statusText
        };
        
        // Try to parse error response as JSON
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorJson = await response.json();
            errorData = { ...errorData, ...errorJson };
          } else {
            errorData.message = await response.text() || response.statusText;
          }
        } catch (parseError) {
          console.warn('Could not parse error response as JSON');
        }
        
        console.error(`%c[API ERROR] ${response.status}: ${errorData.error || 'Unknown'} - ${errorData.message || response.statusText}`, 
          'background: #f44336; color: white; padding: 2px 5px; border-radius: 2px;');
        
        // Create a structured error
        const error = new Error(errorData.message || errorData.errorMessage || response.statusText);
        error.status = response.status;
        error.errorCode = errorData.error || errorData.errorCode;
        error.details = errorData;
        
        // For server errors, attempt retry if we haven't reached max retries
        if (response.status >= 500 && retryCount < maxRetries) {
          console.warn(`Retrying request (${retryCount + 1}/${maxRetries})...`);
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw error;
      }

      // For empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        console.log(`%c[API SUCCESS] Empty response`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;');
        return null;
      }

      // For JSON responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`%c[API SUCCESS] Response:`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;', data);
        return data;
      }

      // For other content types
      const textData = await response.text();
      console.log(`%c[API SUCCESS] Text response:`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;', textData);
      return textData;
      
    } catch (error) {
      console.error(`%c[API ERROR] Request failed:`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 2px;', error);
      throw error;
    }
  }

  // Room API methods
  async createRoom(hostId, hostName, hostCharacter) {
    return this.makeRequest('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({
        hostId,
        hostName,
        hostCharacter
      })
    });
  }

  async joinRoom(roomId, guestId, guestName, guestCharacter) {
    return this.makeRequest(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({
        guestId,
        guestName,
        guestCharacter
      })
    });
  }

  async getRoom(roomId) {
    return this.makeRequest(`/api/rooms/${roomId}`);
  }

  async updateRoomStatus(roomId, status, winner = null) {
    const body = { status };
    if (winner) body.winner = winner;
    
    return this.makeRequest(`/api/rooms/${roomId}/status`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async processRoomAction(roomId, action) {
    return this.makeRequest(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      body: JSON.stringify(action)
    });
  }

  async getAllRooms() {
    return this.makeRequest('/api/rooms');
  }

  // Game API methods
  async createGame(player1, player2) {
    return this.makeRequest('/api/games', {
      method: 'POST',
      body: JSON.stringify({ player1, player2 })
    });
  }

  async getGame(gameId) {
    return this.makeRequest(`/api/games/${gameId}`);
  }

  async processGameAction(gameId, action) {
    return this.makeRequest(`/api/games/${gameId}/action`, {
      method: 'POST',
      body: JSON.stringify(action)
    });
  }

  // User API methods
  async updateUserRating(userId, isWin) {
    return this.makeRequest(`/api/users/${userId}/rating?isWin=${isWin}`, {
      method: 'PUT'
    });
  }

  // Health check method
  async healthCheck() {
    return this.makeRequest('/api/health')
      .then(() => true)
      .catch(() => false);
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;
