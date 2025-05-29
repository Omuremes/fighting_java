import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ShopItem = ({ name, description, cost, costType, image, onPurchase, disabled, hasItemInInventory }) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await onPurchase();
      // Показываем успешную покупку
      setTimeout(() => setIsPurchasing(false), 1000);
    } catch (error) {
      console.error("Purchase failed:", error);
      setIsPurchasing(false);
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all transform hover:scale-105">
      <div className="h-48 bg-gray-700 flex items-center justify-center p-4">
        <img 
          src={image} 
          alt={name} 
          className="h-full object-contain"
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold mb-1">{name}</h3>
        <p className="text-gray-400 mb-4 h-12 overflow-hidden">{description}</p>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {costType === 'coin' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-bold text-lg">{cost}</span>
          </div>          <button
            onClick={handlePurchase}
            disabled={disabled || isPurchasing}
            className={`px-4 py-2 rounded-md ${
              disabled
                ? 'bg-gray-700 cursor-not-allowed text-gray-500'
                : isPurchasing
                ? 'bg-green-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            } transition-colors`}          >
            {isPurchasing ? 'Куплено!' : disabled && hasItemInInventory ? 'В инвентаре' : 'Купить'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Shop = () => {
  const navigate = useNavigate();
  const { currentUser, updateCurrency, addToInventory, hasItem } = useAuth();
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' or 'inventory'
  const [inventoryStatus, setInventoryStatus] = useState({});
  
  // Проверка доступности средств
  const canAffordCoin = (amount) => (currentUser?.coin || 0) >= amount;
  const canAffordGem = (amount) => (currentUser?.gem || 0) >= amount;
  
  // Проверка наличия предмета в инвентаре - обертка над асинхронной функцией hasItem
  const hasItemInInventory = (itemId) => {
    // Возвращаем кэшированное значение, если оно есть
    if (inventoryStatus[itemId] !== undefined) {
      return inventoryStatus[itemId];
    }
    // Возвращаем результат проверки из currentUser.inventory как временное значение
    return currentUser?.inventory?.includes(itemId) || false;
  };
  
  // Обработка покупки
  const handlePurchase = async (item) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      // Определяем тип валюты и стоимость
      const costType = item.costType;
      const cost = item.cost;
      
      // Проверяем можно ли совершить покупку
      const canAfford = costType === 'coin' 
        ? canAffordCoin(cost)
        : canAffordGem(cost);
      
      if (!canAfford) {
        setPurchaseStatus({
          success: false,
          message: `Недостаточно ${costType === 'coin' ? 'монет' : 'кристаллов'}`
        });
        return;
      }
      
      // Списываем валюту
      const currencyUpdate = costType === 'coin'
        ? { addCoins: -cost, addGems: 0 }
        : { addCoins: 0, addGems: -cost };      // Проверяем, есть ли уже предмет в инвентаре
      // Сначала проверяем кэшированное значение
      if (inventoryStatus[item.id] || hasItemInInventory(item.id)) {
        setPurchaseStatus({
          success: false,
          message: `У вас уже есть ${item.name}!`
        });
        return;
      }
      
      // Для большей надежности также проверяем через API
      const hasItemResult = await hasItem(item.id);
      if (hasItemResult) {
        setInventoryStatus(prev => ({ ...prev, [item.id]: true }));
        setPurchaseStatus({
          success: false,
          message: `У вас уже есть ${item.name}!`
        });
        return;
      }
      
      // Списываем валюту
      await updateCurrency(currentUser.uid, currencyUpdate);
      
      // Добавляем предмет в инвентарь пользователя
      const inventoryResult = await addToInventory(currentUser.uid, item.id);
      
      if (inventoryResult.success) {
        setPurchaseStatus({
          success: true,
          message: `Вы приобрели ${item.name}!`
        });
      } else {
        // Возвращаем валюту обратно, если не удалось добавить предмет
        const refundUpdate = costType === 'coin'
          ? { addCoins: cost, addGems: 0 }
          : { addCoins: 0, addGems: cost };
        await updateCurrency(currentUser.uid, refundUpdate);
        
        setPurchaseStatus({
          success: false,
          message: `Ошибка при покупке: ${inventoryResult.message}`
        });
      }
      
      setTimeout(() => {
        setPurchaseStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error("Purchase error:", error);
      setPurchaseStatus({
        success: false,
        message: "Ошибка при покупке. Попробуйте еще раз."
      });
    }
  };
    // Каталог товаров
  const shopItems = [
    {
      id: 'character_skin1',
      name: 'Скин персонажа',
      description: 'Эксклюзивный скин для вашего бойца',
      cost: 500,
      costType: 'coin',
      image: '/assets/player1/Sprites/Idle.png'
    },
    {
      id: 'special_move1',
      name: 'Специальный приём',
      description: 'Новый прием для вашего бойца',
      cost: 1000,
      costType: 'coin',
      image: '/assets/player1/Sprites/Attack2.png'
    },
    {
      id: 'premium_character1',
      name: 'Премиум персонаж',
      description: 'Разблокируйте нового персонажа',
      cost: 10,
      costType: 'gem',
      image: '/assets/player3/Sprites/Idle.png'
    },
    {
      id: 'health_boost',
      name: 'Бустер здоровья',
      description: '+20% к максимальному здоровью',
      cost: 800,
      costType: 'coin',
      image: '/assets/player2/Sprites/Idle.png'
    },
    {
      id: 'damage_boost',
      name: 'Бустер урона',
      description: '+15% к наносимому урону',
      cost: 5,
      costType: 'gem',
      image: '/assets/player1/Sprites/Attack1.png'
    },
    {
      id: 'premium_background',
      name: 'Премиум арена',
      description: 'Эксклюзивный фон для сражений',
      cost: 7,
      costType: 'gem',
      image: '/assets/2DBackground_22.png'
    }
  ];
  
  // Загрузка статуса инвентаря при монтировании компонента
  useEffect(() => {
    if (currentUser && currentUser.uid) {
      // Загрузка статуса для каждого предмета при загрузке страницы
      const loadInventoryStatus = async () => {
        const statusUpdates = {};
        
        // Используем Promise.all для параллельной загрузки статуса всех предметов
        await Promise.all(shopItems.map(async (item) => {
          try {
            const hasItemResult = await hasItem(item.id);
            statusUpdates[item.id] = hasItemResult;
          } catch (error) {
            console.error(`Error checking item ${item.id}:`, error);
            statusUpdates[item.id] = false;
          }
        }));
        
        setInventoryStatus(statusUpdates);
      };
      
      loadInventoryStatus();
    }
  }, [currentUser, hasItem, shopItems]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Магазин</h1>
        <div className="flex items-center space-x-4">
          {currentUser && (
            <>
              <div className="flex items-center mr-4">
                <div className="flex items-center bg-yellow-700 px-3 py-1 rounded-md mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-yellow-400 font-bold">{currentUser.coin || 0}</span>
                </div>
                <div className="flex items-center bg-purple-900 px-3 py-1 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span className="text-purple-400 font-bold">{currentUser.gem || 0}</span>
                </div>
              </div>
            </>
          )}
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm transition-colors"
          >
            В меню
          </button>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto max-w-6xl py-12 px-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Магазин предметов</h1>
          <div className="flex space-x-4">
            <button 
              className={`py-2 px-4 rounded-md text-sm transition-colors ${
                activeTab === 'shop' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              onClick={() => setActiveTab('shop')}
            >
              Магазин
            </button>
            <button 
              className={`py-2 px-4 rounded-md text-sm transition-colors ${
                activeTab === 'inventory' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              onClick={() => setActiveTab('inventory')}
            >
              Инвентарь ({currentUser?.inventory?.length || 0})
            </button>
          </div>
        </div>
        
        {/* Статус покупки */}
        {purchaseStatus && (
          <div className={`p-4 mb-6 rounded-md ${
            purchaseStatus.success ? 'bg-green-800' : 'bg-red-800'
          }`}>
            <p>{purchaseStatus.message}</p>
          </div>
        )}
        
        {activeTab === 'inventory' ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Ваш инвентарь</h2>
            {currentUser?.inventory?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentUser.inventory.map(itemId => {
                  const item = shopItems.find(i => i.id === itemId) || {
                    id: itemId,
                    name: 'Неизвестный предмет',
                    description: 'Нет описания',
                    image: '/assets/player1/Sprites/Idle.png'
                  };
                  return (
                    <div key={itemId} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg p-4">
                      <div className="h-48 bg-gray-700 flex items-center justify-center p-4">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="h-full object-contain"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-xl font-bold mb-1">{item.name}</h3>
                        <p className="text-gray-400 mb-4">{item.description}</p>
                        <div className="bg-green-700 text-white py-1 px-3 rounded-md inline-block">
                          В инвентаре
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-800 p-8 rounded-lg text-center">
                <p className="text-xl text-gray-400">У вас пока нет предметов в инвентаре</p>
                <button 
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md text-sm transition-colors mt-4"
                  onClick={() => setActiveTab('shop')}
                >
                  Перейти в магазин
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">Доступные товары</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shopItems.map(item => (
                <ShopItem
                  key={item.id}
                  name={item.name}
                  description={item.description}
                  cost={item.cost}
                  costType={item.costType}
                  image={item.image}                  disabled={
                    hasItemInInventory(item.id) || // Уже куплен
                    (item.costType === 'coin' 
                      ? !canAffordCoin(item.cost)
                      : !canAffordGem(item.cost)
                    )
                  }                  onPurchase={() => handlePurchase(item)}
                  hasItemInInventory={hasItemInInventory(item.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
      
      <footer className="bg-gray-800 py-4 px-6 text-center text-gray-400">
        <p>&copy; 2025 Fighting Game. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default Shop;
