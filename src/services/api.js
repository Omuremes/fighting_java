// API service for backend communication

const API_BASE_URL = '/api'; // Use proxy path instead of direct backend URL

class ApiService {
  // Helper method for making HTTP requests
  // Update the makeRequest method to provide better error objects
async makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
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
      
      try {
        const errorJson = await response.json();
        errorData = { ...errorData, ...errorJson };
      } catch (parseError) {
        console.warn('Could not parse error response as JSON');
      }
      
      console.error(`%c[API ERROR] ${response.status}: ${errorData.error || 'Unknown'} - ${errorData.message || response.statusText}`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 2px;');
      
      // Create a structured error
      const error = new Error(errorData.message || errorData.errorMessage || response.statusText);
      error.status = response.status;
      error.errorCode = errorData.error || errorData.errorCode;
      error.details = errorData;
      throw error;
    }

    const data = await response.json();
    console.log(`%c[API SUCCESS] Response:`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;', data);
    return data;
  } catch (error) {
    console.error(`%c[API ERROR] Request failed:`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 2px;', error);
    throw error;
  }
}
  // Room API methods
  async createRoom(hostId, hostName, hostCharacter) {
    return this.makeRequest('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        hostId,
        hostName,
        hostCharacter
      })
    });
  }

  async joinRoom(roomId, guestId, guestName, guestCharacter) {
    return this.makeRequest(`/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({
        guestId,
        guestName,
        guestCharacter
      })
    });
  }

  async getRoom(roomId) {
    return this.makeRequest(`/rooms/${roomId}`);
  }

  async updateRoomStatus(roomId, status, winner = null) {
    const body = { status };
    if (winner) body.winner = winner;
    
    return this.makeRequest(`/rooms/${roomId}/status`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async processRoomAction(roomId, action) {
    return this.makeRequest(`/rooms/${roomId}/action`, {
      method: 'POST',
      body: JSON.stringify(action)
    });
  }

  async getAllRooms() {
    return this.makeRequest('/rooms');
  }

  // Game API methods
  async createGame(player1, player2) {
    return this.makeRequest('/games', {
      method: 'POST',
      body: JSON.stringify({ player1, player2 })
    });
  }

  async getGame(gameId) {
    return this.makeRequest(`/games/${gameId}`);
  }

  async processGameAction(gameId, action) {
    return this.makeRequest(`/games/${gameId}/action`, {
      method: 'POST',
      body: JSON.stringify(action)
    });
  }

  // User API methods
  async updateUserRating(userId, isWin) {
    return this.makeRequest(`/users/${userId}/rating?isWin=${isWin}`, {
      method: 'PUT'
    });
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;
