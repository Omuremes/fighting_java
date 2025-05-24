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
  getDoc 
} from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";
import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage';

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
      rank: 'Бронза'
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
  }

  // Обновление рейтинга после игры
  async function updateRating(uid, isWin) {
    const userData = await getUserData(uid);
    if (userData) {
      const ratingChange = isWin ? 15 : -10;
      const newRating = Math.max(0, userData.rating + ratingChange);
      const newRank = getRank(newRating);
      
      await updateUserData(uid, {
        rating: newRating,
        rank: newRank
      });
      
      return { newRating, newRank };
    }
    return null;
  }

  // Слушатель изменения состояния аутентификации
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await getUserData(user.uid);
        setCurrentUser({ ...user, ...userData });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);  // Получение списка персонажей из Firebase Storage
  async function getCharacters() {
    try {
      const characters = [];        // Информация о персонажах
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
            speed: 9
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
          // Для персонажа в игре это URL не будет использоваться, 
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
  }

  const value = {
    currentUser,
    register,
    login,
    logout,
    getUserData,
    updateUserData,
    updateRating,
    getCharacters
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
