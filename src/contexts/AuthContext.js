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
  }, []);

  const value = {
    currentUser,
    register,
    login,
    logout,
    getUserData,
    updateUserData,
    updateRating
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
