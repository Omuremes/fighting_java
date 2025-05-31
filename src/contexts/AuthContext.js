import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";
import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage';
import apiService from '../services/api';
import webSocketService from '../services/WebSocketService';

// Инициализация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtv9Vo2FCqGutkvPzeAEYFJ45_Cr4V_Ag",
  authDomain: "fighting-game-199e4.firebaseapp.com",
  projectId: "fighting-game-199e4",
  storageBucket: "fighting-game-199e4.firebasestorage.app",
  messagingSenderId: "921439395178",
  appId: "1:921439395178:web:102881f73fcd4942805913",
  measurementId: "G-0T5KVEYK5H"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Контекст для аутентификации
const AuthContext = createContext();

// Ранги пользователей в зависимости от рейтинга
const getRank = (rating) => {
  if (rating < 100) return 'Бронза';
  if (rating < 200) return 'Серебро';
  if (rating < 400) return 'Золото';
  if (rating < 600) return 'Платина';
  if (rating < 800) return 'Алмаз';
  return 'Легенда';
};

// Провайдер аутентификации
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Регистрация пользователя
  async function register(email, password, name) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Создаем запись в коллекции Users
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name,
      password: "***", // Не сохраняем пароль в Firestore в открытом виде
      rating: 0,
      rank: 'Бронза',
      coin: 100, // Начальное количество монет
      gem: 5    // Начальное количество драгоценных камней
    });
    return userCredential;
  }

  // Вход пользователя
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Выход пользователя
  function logout() {
    return signOut(auth);
  }

  // Получение данных пользователя из Firestore
  async function getUserData(uid) {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  }

  // Обновление данных пользователя
  async function updateUserData(uid, data) {
    await setDoc(doc(db, "users", uid), data, { merge: true });
    return getUserData(uid);
  }  // Обновление рейтинга после игры
  async function updateRating(uid, isWin) {
    try {
      console.log(`%c[API] Updating rating - uid: ${uid}, isWin: ${isWin}`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;');
      
      // Получим текущие данные пользователя для диагностики
      const initialUserData = await getUserData(uid);
      console.log(`%c[SYNC] Initial user data before update:`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 2px;', initialUserData);
      
      // Вызов API бэкенда для обновления рейтинга и валюты
      const response = await fetch(`/api/users/${uid}/rating?isWin=${isWin}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}):`, errorText);
        throw new Error(`Failed to update rating: ${response.status} ${response.statusText}`);
      }
      
      const updatedUser = await response.json();
      console.log(`%c[API] Rating update successful:`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;', updatedUser);
      
      // Рассчитываем заработанные монеты и кристаллы
      const coinEarned = isWin ? 25 : 5;
      const gemEarned = isWin ? 1 : 0;
      
      // Обеспечиваем согласованность данных в Firestore 
      // с конкретными значениями полученными от сервера
      try {
        await setDoc(doc(db, "users", uid), {
          rating: updatedUser.rating,
          rank: updatedUser.rank,
          coin: updatedUser.coin,
          gem: updatedUser.gem
        }, { merge: true });
        
        console.log(`%c[SYNC] Successfully updated Firestore with values from API:`, 
                   'background: #2196F3; color: white; padding: 2px 5px; border-radius: 2px;', {
          rating: updatedUser.rating,
          rank: updatedUser.rank,
          coin: updatedUser.coin,
          gem: updatedUser.gem
        });
        
        // Проверим, что данные действительно обновились
        setTimeout(async () => {
          const verifyData = await getUserData(uid);
          console.log(`%c[SYNC] Verification data after update:`, 
                     'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 2px;', verifyData);
          
          // Проверка, что данные обновились правильно
          const coinsUpdated = verifyData.coin === updatedUser.coin;
          const gemsUpdated = verifyData.gem === updatedUser.gem;
          
          console.log(`%c[SYNC] Currency update verification: ${coinsUpdated && gemsUpdated ? 'SUCCESS ✓' : 'FAILED ✗'}`, 
                     `background: ${coinsUpdated && gemsUpdated ? '#4CAF50' : '#F44336'}; color: white; padding: 2px 5px; border-radius: 2px;`, {
            expected: { coin: updatedUser.coin, gem: updatedUser.gem },
            actual: { coin: verifyData.coin, gem: verifyData.gem }
          });
        }, 1000);
      } catch (firestoreError) {
        console.error("Error updating Firestore:", firestoreError);
      }
      
      // Также обновим локальное состояние для немедленного эффекта в UI
      setCurrentUser(prev => ({
        ...prev,
        rating: updatedUser.rating,
        rank: updatedUser.rank,
        coin: updatedUser.coin,
        gem: updatedUser.gem
      }));
      
      return { 
        newRating: updatedUser.rating, 
        newRank: updatedUser.rank,
        coinEarned,
        gemEarned,
        totalCoin: updatedUser.coin,
        totalGem: updatedUser.gem
      };
    } catch (error) {
      console.error("Error updating user rating:", error);
      
      // Для отладки - попробуем прямое обновление Firestore
      try {
        if (isWin) {
          console.log("%c[FALLBACK] Trying direct Firestore update due to API failure", 
                     'background: #FF9800; color: white; padding: 2px 5px; border-radius: 2px;');
          
          const userData = await getUserData(uid);
          if (userData) {
            const coinEarned = isWin ? 25 : 5;
            const gemEarned = isWin ? 1 : 0;
            
            const newCoinTotal = (userData.coin || 0) + coinEarned;
            const newGemTotal = (userData.gem || 0) + gemEarned;
            
            console.log("%c[FALLBACK] Updating with direct values:", 
                       'background: #FF9800; color: white; padding: 2px 5px; border-radius: 2px;', {
              coin: newCoinTotal,
              gem: newGemTotal
            });
            
            // Принудительно устанавливаем конкретные значения, а не используем increment
            await setDoc(doc(db, "users", uid), {
              coin: newCoinTotal,
              gem: newGemTotal
            }, { merge: true });
            
            // Обновляем локальное состояние
            setCurrentUser(prev => ({
              ...prev,
              coin: newCoinTotal,
              gem: newGemTotal
            }));
            
            return {
              coinEarned,
              gemEarned,
              totalCoin: newCoinTotal,
              totalGem: newGemTotal
            };
          }
        }
      } catch (fallbackError) {
        console.error("%c[FALLBACK] Fallback update also failed:", 
                     'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;', 
                     fallbackError);
      }
      
      return null;
    }
  }
  // Обновление игровой валюты пользователя
  async function updateCurrency(uid, { addCoins = 0, addGems = 0 }) {
    try {
      // Вызов API бэкенда для обновления валюты
      const response = await fetch(`/api/users/${uid}/currency?addCoins=${addCoins}&addGems=${addGems}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update currency: ${response.statusText}`);
      }
      
      const updatedUser = await response.json();
      
      // Обновление локального состояния пользователя
      setCurrentUser(prev => ({
        ...prev,
        coin: updatedUser.coin,
        gem: updatedUser.gem
      }));
      
      return { 
        coinChange: addCoins,
        gemChange: addGems,
        totalCoin: updatedUser.coin,
        totalGem: updatedUser.gem
      };
    } catch (error) {
      console.error("Error updating user currency:", error);
      return null;
    }
  }
    // Добавление предмета в инвентарь пользователя
  async function addToInventory(uid, itemId) {
    try {
      // Вызов API бэкенда для добавления предмета в инвентарь
      const response = await fetch(`/api/users/${uid}/inventory?itemId=${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add item to inventory: ${response.statusText}`);
      }
      
      const updatedUser = await response.json();
      
      // Обновление локального состояния пользователя
      setCurrentUser(prev => ({
        ...prev,
        inventory: updatedUser.inventory
      }));
      
      return { 
        success: true, 
        inventory: updatedUser.inventory 
      };
    } catch (error) {
      console.error("Error adding item to inventory:", error);
      return { 
        success: false, 
        message: error.message || "Ошибка при добавлении предмета в инвентарь" 
      };
    }
  }
    // Проверка наличия предмета у пользователя
  async function hasItem(itemId) {
    try {
      if (!currentUser || !currentUser.uid) {
        return false;
      }
      
      // Используем локальное состояние для быстрой проверки
      if (currentUser.inventory && Array.isArray(currentUser.inventory)) {
        return currentUser.inventory.includes(itemId);
      }
      
      // Если локальных данных нет, запрашиваем с сервера
      const response = await fetch(`/api/users/${currentUser.uid}/inventory/${itemId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check item in inventory: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result; // Сервер вернет true или false
    } catch (error) {
      console.error("Error checking item in inventory:", error);
      return false;
    }
  }
  // Слушатель изменения состояния аутентификации
  useEffect(() => {
    let userDocUnsubscribe = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Первичная загрузка данных пользователя
        const userData = await getUserData(user.uid);
        setCurrentUser({ ...user, ...userData });
        setLoading(false);
        
        // Настройка real-time listener для документа пользователя
        const userDocRef = doc(db, "users", user.uid);
        userDocUnsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            console.log("%c[REALTIME] Firestore document update received:", 
                       "background: #009688; color: white; padding: 2px 5px; border-radius: 2px;", userData);
            
            // Сохраняем предыдущие значения для сравнения
            let prevValues = {};
            if (currentUser) {
              prevValues = {
                coin: currentUser.coin,
                gem: currentUser.gem,
                rating: currentUser.rating,
                rank: currentUser.rank
              };
            }
            
            // Обновляем только состояние пользователя, сохраняя свойства Firebase Auth
            setCurrentUser(prevUser => {
              const updatedUser = {
                ...prevUser,
                ...userData
              };
              
              // Логируем изменения в важных полях
              const changes = {};
              if (prevValues.coin !== userData.coin) changes.coin = `${prevValues.coin} → ${userData.coin}`;
              if (prevValues.gem !== userData.gem) changes.gem = `${prevValues.gem} → ${userData.gem}`;
              if (prevValues.rating !== userData.rating) changes.rating = `${prevValues.rating} → ${userData.rating}`;
              if (prevValues.rank !== userData.rank) changes.rank = `${prevValues.rank} → ${userData.rank}`;
              
              if (Object.keys(changes).length > 0) {
                console.log("%c[REALTIME] User state updated:", 
                           "background: #009688; color: white; padding: 2px 5px; border-radius: 2px;", changes);
              }
              
              return updatedUser;
            });
          }
        }, (error) => {
          console.error("Error in user document listener:", error);
        });
      } else {
        setCurrentUser(null);
        setLoading(false);
        
        // Отписываемся от слушателя документа, если пользователь вышел
        if (userDocUnsubscribe) {
          userDocUnsubscribe();
          userDocUnsubscribe = null;
        }
      }
    });

    // Очистка слушателей при размонтировании
    return () => {
      authUnsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, []);
  
  // Получение списка персонажей из Firebase Storage
  async function getCharacters() {
    try {
      const characters = [];
      
      // Информация о персонажах      
      const characterInfo = {
        'character1': {
          name: 'Самурай',
          description: 'Опытный воин с мечом',
          stats: {
            attack: 8,
            defense: 7,
            speed: 5
          }
        },
        'character2': {
          name: 'Рыцарь',
          description: 'Рыцарь с тяжелыми доспехами',
          stats: {
            attack: 7,
            defense: 4,
            speed: 9          }        },'player3': {
          name: 'Злой Волшебник',
          description: 'Могущественный темный маг',
          stats: {
            attack: 10,
            defense: 5,
            speed: 4
          }
        },
        'character3': {
          name: 'Ниндзя',
          description: 'Быстрый и смертоносный воин тени',
          stats: {
            attack: 9,
            defense: 5,
            speed: 10
          }
        },
        'character4': {
          name: 'Маг',
          description: 'Владеет мощной магией стихий',
          stats: {
            attack: 10,
            defense: 3,
            speed: 6
          }
        }
      };
      
      // Получаем список директорий с персонажами
      const characterDirs = Object.keys(characterInfo);
      
      for (const dir of characterDirs) {
        const storageRef = ref(storage, dir);
        const idleImageRef = ref(storage, `${dir}/Idle.png`);
          try {
          const imageUrl = await getDownloadURL(idleImageRef);
          // Для превью персонажа в меню используем URL из Firebase Storage
          // Для персонада в игре это URL не будет использоваться, 
          // вместо этого будут использоваться локальные пути
          characters.push({
            id: dir,
            name: characterInfo[dir].name,
            description: characterInfo[dir].description,
            stats: characterInfo[dir].stats,
            imageUrl: imageUrl
          });
        } catch (error) {
          console.error(`Ошибка при загрузке изображения для ${dir}:`, error);
        }
      }
      
      return characters;
    } catch (error) {
      console.error('Ошибка при получении списка персонажей:', error);
      return [];
    }
  }  // Получение статистики персонажа из Firebase
  async function getCharacterStats(characterId) {
    try {
      const statsDoc = await getDoc(doc(db, "characters", characterId));
      if (statsDoc.exists()) {
        return statsDoc.data();
      }
      
      // Если статистики нет в базе, используем значения по умолчанию
      const defaultStats = {
        attack: 5,
        defense: 5,
        speed: 5
      };
      
      // Сохраняем значения по умолчанию в базу
      await setDoc(doc(db, "characters", characterId), defaultStats);
      return defaultStats;
    } catch (error) {
      console.error("Error getting character stats:", error);
      return {
        attack: 5,
        defense: 5,
        speed: 5
      };
    }
  }

  // Обновление статистики персонажа
  async function updateCharacterStats(characterId, stats) {
    try {
      await setDoc(doc(db, "characters", characterId), stats, { merge: true });
      return true;
    } catch (error) {
      console.error("Error updating character stats:", error);
      return false;
    }
  }

  // Инициализация статистики персонажей при первом запуске
  async function initializeCharacterStats() {
    try {
      const defaultStats = {
        character1: {
          name: 'Самурай',
          attack: 8,
          defense: 7,
          speed: 5
        },
        character2: {
          name: 'Рыцарь',
          attack: 7,
          defense: 8,
          speed: 4
        },
        player3: {
          name: 'Злой Волшебник',
          attack: 10,
          defense: 3,
          speed: 6
        },
        character3: {
          name: 'Ниндзя',
          attack: 9,
          defense: 5,
          speed: 10
        },
        character4: {
          name: 'Маг',
          attack: 10,
          defense: 3,
          speed: 6
        }
      };

      // Проверяем и инициализируем статистику для каждого персонажа
      for (const [characterId, stats] of Object.entries(defaultStats)) {
        const statsDoc = await getDoc(doc(db, "characters", characterId));
        if (!statsDoc.exists()) {
          await setDoc(doc(db, "characters", characterId), stats);
          console.log(`Initialized stats for ${stats.name}`);
        }
      }
    } catch (error) {
      console.error("Error initializing character stats:", error);
    }
  }

  // Room creation is now handled entirely by backend - no frontend creation

  async function joinRoom(roomId, guestId, guestName, guestCharacter) {
    try {
      // Normalize room ID for consistency
      const normalizedRoomId = roomId.toLowerCase().trim();
      
      console.log(`%c[ROOM] Joining room via backend API: ${normalizedRoomId}`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 2px;');
      
      // Join room in backend using the normalized room ID
      const backendRoom = await apiService.joinRoom(normalizedRoomId, guestId, guestName, guestCharacter);
      
      // Get or create Firebase room for real-time sync
      const firebaseRoomRef = doc(db, "rooms", roomId);
      const firebaseRoomDoc = await getDoc(firebaseRoomRef);
      
      let firebaseRoomData;
      if (firebaseRoomDoc.exists()) {
        firebaseRoomData = firebaseRoomDoc.data();
      } else {
        // Create Firebase room if it doesn't exist (for backend-first rooms)
        firebaseRoomData = {
          roomId: backendRoom.roomId,
          hostId: backendRoom.hostId,
          hostName: backendRoom.hostName,
          hostCharacter: backendRoom.hostCharacter,
          hostReady: true,
          status: 'waiting',
          createdAt: backendRoom.createdAt,
          backendRoomId: backendRoom.roomId
        };
      }
      
      // Update Firebase for real-time sync
      const timestamp = new Date().toISOString();
      await setDoc(firebaseRoomRef, {
        ...firebaseRoomData,
        guestId,
        guestName,
        guestCharacter,
        guestReady: true,
        status: backendRoom.status,
        updatedAt: timestamp,
        gameId: backendRoom.gameId // Store the game ID from backend
      }, { merge: true });
      
      console.log(`%c[ROOM] Joined room successfully: ${roomId}`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;');
      return { ...firebaseRoomData, guestId, guestName, guestCharacter, guestReady: true, backendRoom };
    } catch (error) {
      console.error("Error joining room:", error);
      throw error;
    }
  }

  async function getRoomData(roomId) {
    try {
      // Normalize room ID for consistency
      const normalizedRoomId = roomId.toLowerCase().trim();
      
      // First try to get room data from backend
      let backendRoom = null;
      try {
        backendRoom = await apiService.getRoom(normalizedRoomId);
      } catch (backendError) {
        console.warn("Could not fetch backend room data:", backendError);
      }

      // Get room data from Firebase for real-time sync
      const roomDoc = await getDoc(doc(db, "rooms", normalizedRoomId));
      
      if (roomDoc.exists()) {
        const firebaseRoom = roomDoc.data();
        return { ...firebaseRoom, backendRoom };
      } else if (backendRoom) {
        // If room only exists in backend, create Firebase sync entry
        const firebaseRoomData = {
          roomId: backendRoom.roomId,
          hostId: backendRoom.hostId,
          hostName: backendRoom.hostName,
          hostCharacter: backendRoom.hostCharacter,
          guestId: backendRoom.guestId,
          guestName: backendRoom.guestName,
          guestCharacter: backendRoom.guestCharacter,
          status: backendRoom.status,
          createdAt: backendRoom.createdAt,
          lastUpdated: backendRoom.lastUpdated,
          hostReady: true,
          guestReady: backendRoom.guestId ? true : false,
          backendRoomId: backendRoom.roomId
        };
        
        // Create Firebase room for real-time sync
        await setDoc(doc(db, "rooms", roomId), firebaseRoomData);
        
        return { ...firebaseRoomData, backendRoom };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting room data:", error);
      return null;
    }
  }
    function listenToRoom(roomId, callback) {
    const roomRef = doc(db, "rooms", roomId);
    const firestoreUnsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        callback({
          type: 'room_metadata',
          data: doc.data()
        });
      } else {
        callback({
          type: 'error',
          error: 'ROOM_NOT_FOUND',
          message: 'Room not found'
        });
      }
    }, (error) => {
      console.error("Error listening to room:", error);
      callback({
        type: 'error',
        error: 'FIRESTORE_ERROR',
        message: error.message
      });
    });
    
    // Add WebSocket subscription for real-time game events
    let wsSubscription = null;
    webSocketService.connect()
      .then(() => {
        wsSubscription = webSocketService.subscribeToRoom(roomId, (action) => {
          // Handle WebSocket message
          callback(action);
        });
        
        // Set playerId for room join message
        wsSubscription.playerId = currentUser?.uid;
      })
      .catch(error => {
        console.error("WebSocket connection error:", error);
        callback({
          type: 'error',
          error: 'WEBSOCKET_ERROR',
          message: error.message
        });
      });
    
    // Return a combined unsubscribe function
    return () => {
      firestoreUnsubscribe();
      if (wsSubscription) {
        wsSubscription.unsubscribe();
      }
    };
  }
    async function updateRoomStatus(roomId, statusOrData, winner = null) {
    try {
      console.log(`%c[ROOM] Updating room status via backend: ${roomId}`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 2px;');
      
      const timestamp = new Date().toISOString();
      
      // Handle both string status or object with multiple fields
      const updateData = typeof statusOrData === 'string' 
        ? { status: statusOrData, updatedAt: timestamp }
        : { ...statusOrData, updatedAt: timestamp };
      
      // Get Firebase room data to get backend room ID
      const firebaseRoom = await getDoc(doc(db, "rooms", roomId));
      if (firebaseRoom.exists()) {
        const roomData = firebaseRoom.data();
        const backendRoomId = roomData.backendRoomId || roomId;
        
        // Update backend room status
        if (typeof statusOrData === 'string') {
          await apiService.updateRoomStatus(backendRoomId, statusOrData, winner);
        }
      }
      
      // Update Firebase for real-time sync
      await setDoc(doc(db, "rooms", roomId), updateData, { merge: true });
      
      console.log(`%c[ROOM] Room status updated successfully: ${roomId}`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;');
      return true;
    } catch (error) {
      console.error("Error updating room status:", error);
      return false;
    }
  }
    // Helper function to get local IP address
  async function getLocalIp() {
    try {
      // For local development, we need to get the local network IP, not the public one
      // This approach uses WebRTC to get local IPs
      return new Promise((resolve, reject) => {
        // Using WebRTC to detect local IP addresses
        const pc = new RTCPeerConnection({
          // Use public STUN servers
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        // Listening for candidate events to get IP addresses
        pc.createDataChannel('');
        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          
          // Regex to extract IP addresses from ICE candidate strings
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = ipRegex.exec(event.candidate.candidate);
          
          if (match) {
            const ip = match[1];
            // We only want local network IPs (usually starting with 192.168, 10., or 172.)
            if (ip.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
              resolve(ip);
              pc.close();
            }
          }
        };
        
        // Create an offer to generate ICE candidates
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .catch(err => {
            console.error("Error creating WebRTC offer:", err);
            // Fallback to localhost if WebRTC detection fails
            resolve('127.0.0.1');
          });
        
        // Timeout in case no local IP is found
        setTimeout(() => {
          resolve('127.0.0.1');
          pc.close();
        }, 2000);
      });
    } catch (error) {
      console.error("Error getting local IP:", error);
      return '127.0.0.1';
    }
  }
    // Function to sync player actions in online game - now using backend API
  async function syncPlayerAction(roomId, playerType, actionData) {
    try {
      const timestamp = Date.now();
      
      // Rate limiting for position updates to avoid excessive writes
      if (actionData.type === 'move' && !actionData.isCritical) {
        const now = Date.now();
        const lastUpdateTime = syncPlayerAction.lastUpdateTime || 0;
        
        // Limit position updates to once every 33ms (30 updates per second)
        if (now - lastUpdateTime < 33) {
          return true; // Skip this update
        }
        
        syncPlayerAction.lastUpdateTime = now;
      }
      
      // Create the action object
      const gameAction = {
        playerId: currentUser?.uid,
        playerType: playerType,
        type: actionData.type || 'update',
        data: actionData,
        timestamp: timestamp
      };
      
      // Send via WebSocket for real-time delivery
      const result = webSocketService.sendGameAction(roomId, gameAction);
      
      // For critical actions or if WebSocket fails, also send via REST API as backup
      if (!result || actionData.isCritical || 
          actionData.type === 'attack' || 
          actionData.type === 'hit' || 
          actionData.type === 'special' || 
          actionData.type === 'health') {
        try {
          const backendRoomId = await getRoomBackendId(roomId);
          await apiService.processRoomAction(backendRoomId, gameAction);
        } catch (apiError) {
          console.warn("Failed to send action to REST API:", apiError);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error syncing player action:", error);
      return false;
    }
  }

  // Helper function to get a room's backend ID
  async function getRoomBackendId(roomId) {
    try {
      const roomDoc = await getDoc(doc(db, "rooms", roomId));
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        return roomData.backendRoomId || roomId;
      }
      return roomId;
    } catch (error) {
      console.error("Error getting room backend ID:", error);
      return roomId;
    }
  }

  // Update the processGameAction function to use WebSockets
  async function processGameAction(roomId, actionData) {
    try {
      console.log(`%c[GAME] Processing game action via WebSocket: ${actionData.type}`, 'background: #3F51B5; color: white; padding: 2px 5px; border-radius: 2px;');
      
      // Add player ID and timestamp
      actionData.playerId = currentUser?.uid;
      actionData.timestamp = Date.now();
      
      // Send via WebSocket
      const wsResult = webSocketService.sendGameAction(roomId, actionData);
      
      // Also send via REST API as backup
      try {
        const backendRoomId = await getRoomBackendId(roomId);
        const apiResult = await apiService.processRoomAction(backendRoomId, actionData);
        
        console.log(`%c[GAME] Game action processed successfully`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;');
        return apiResult;
      } catch (apiError) {
        console.warn("Failed to send action to REST API, using WebSocket only:", apiError);
        return wsResult ? { success: true } : null;
      }
    } catch (error) {
      console.error("Error processing game action:", error);
      throw error;
    }
  }
  
  // Initialize the lastUpdateTime property
  syncPlayerAction.lastUpdateTime = 0;
  const value = {
    currentUser,
    register,
    login,
    logout,
    getUserData,
    updateUserData,
    updateRating,
    updateCurrency,
    addToInventory,
    hasItem,
    getCharacters,
    getCharacterStats,
    updateCharacterStats,
    initializeCharacterStats,
    joinRoom,
    getRoomData,
    listenToRoom,
    updateRoomStatus,
    getLocalIp,
    processGameAction
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Хук для использования контекста аутентификации
export function useAuth() {
  return useContext(AuthContext);
}
