import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSprites } from '../contexts/SpritesContext';

const CharacterSelect = ({ onSelectCharacter, onCancel, playerNumber = null }) => {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spriteErrors, setSpriteErrors] = useState({});
  const { getCharacters, getCharacterStats, initializeCharacterStats } = useAuth();
  const { checkSpriteExists, getCharacterSpritePath, debugSpritePaths } = useSprites();
  
  // Function to verify a character's sprites
  const verifyCharacterSprites = async (character) => {
    if (!character || !character.id) {
      return false;
    }
    
    // Get the correct path based on character ID/name
    const spritePath = getCharacterSpritePath(character);
    
    // Use the debug function to log detailed information
    debugSpritePaths(character);
    
    // Critical animations to check
    const animations = ['Idle', 'Attack1', 'Run'];
    const results = {};
    
    console.log(`Verifying animations for ${character.name}...`);
      for (const anim of animations) {
      const img = new Image();
      const imgPath = `${spritePath}${anim}.png`;
      
      const loadResult = await new Promise(resolve => {
        img.onload = () => {
          console.log(`✅ ${character.name} - ${anim} loaded successfully`);
          resolve(true);
        };
        img.onerror = () => {
          console.error(`❌ ${character.name} - ${anim} failed to load from ${imgPath}`);
          resolve(false);
        };
        img.src = imgPath;
      });
      
      results[anim] = loadResult;
    }
    
    const allSuccessful = Object.values(results).every(r => r === true);
    
    if (!allSuccessful) {
      setSpriteErrors(prev => ({
        ...prev,
        [character.id]: results
      }));
    }
    
    return allSuccessful;
  };
    useEffect(() => {
    const loadCharacters = async () => {
      try {
        setLoading(true);
        
        // Инициализируем статистику персонажей при первой загрузке
        await initializeCharacterStats();
        
        const charactersList = await getCharacters();
        
        // Загружаем статистику для каждого персонажа
        const charactersWithStats = await Promise.all(
          charactersList.map(async (char) => {
            const stats = await getCharacterStats(char.id);
            const spritePath = getCharacterSpritePath(char);
            console.log(`Loading stats for ${char.name} (${char.id}):`, stats);
            
            const hasSprites = await checkSpriteExists(spritePath);
            return {
              ...char,
              stats: {
                attack: stats.attack,
                defense: stats.defense,
                speed: stats.speed
              },
              hasSprites,
              spritePath
            };
          })
        );
        
        console.log('Characters loaded with stats:', charactersWithStats);
        setCharacters(charactersWithStats);
        
        // По умолчанию выбираем первого персонажа с доступными спрайтами
        const firstValidCharacter = charactersWithStats.find(char => char.hasSprites);
        if (firstValidCharacter) {
          console.log(`Auto-selecting character: ${firstValidCharacter.name} (${firstValidCharacter.id})`);
          setSelectedCharacterId(firstValidCharacter.id);
        }
      } catch (error) {
        console.error("Ошибка при загрузке персонажей:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCharacters();
  }, [getCharacters, checkSpriteExists, getCharacterSpritePath, getCharacterStats, initializeCharacterStats]);
  const handleSelect = async () => {
    const selectedCharacter = characters.find(char => char.id === selectedCharacterId);
    if (selectedCharacter) {
      // Use the SpritesContext function for path consistency
      const spritePath = getCharacterSpritePath(selectedCharacter);
      console.log(`Selected character ${selectedCharacter.name} with path: ${spritePath}`);
      
      // Verify the character sprites before proceeding
      const isValid = await verifyCharacterSprites(selectedCharacter);
      
      if (!isValid) {
        console.warn(`Character ${selectedCharacter.name} has some sprite loading issues. Continuing anyway with fallbacks.`);
      }
      
      onSelectCharacter({
        ...selectedCharacter,
        spritePath: spritePath,
        spritesVerified: isValid
      });
    }
  };
  
  if (loading) {
    return (
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Загрузка персонажей...</h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }
    return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-white mb-6">
          {playerNumber ? `Выберите персонажа ${playerNumber}` : 'Выберите персонажа'}
        </h2>
        
        {loading ? (
          <div className="text-white text-center">Загрузка персонажей...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map(character => (
              <div
                key={character.id}
                className={`relative bg-gray-800 rounded-lg p-4 cursor-pointer transition-all transform hover:scale-105
                  ${selectedCharacterId === character.id ? 'ring-4 ring-blue-500' : ''}
                  ${!character.hasSprites ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => character.hasSprites && setSelectedCharacterId(character.id)}
              >
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  {character.hasSprites ? (
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="object-cover rounded-md"
                      onError={(e) => {
                        console.error(`Error loading image for ${character.name}`);
                        e.target.src = '/assets/placeholder.png';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-700 rounded-md">
                      <span className="text-gray-400">Спрайты недоступны</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{character.name}</h3>
                
                {/* Статистика персонажа */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-red-400 w-20">Атака:</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${(character.stats?.attack || 0) * 10}%` }}
                      />
                    </div>
                    <span className="text-white ml-2">{character.stats?.attack || 0}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-blue-400 w-20">Защита:</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(character.stats?.defense || 0) * 10}%` }}
                      />
                    </div>
                    <span className="text-white ml-2">{character.stats?.defense || 0}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-green-400 w-20">Скорость:</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(character.stats?.speed || 0) * 10}%` }}
                      />
                    </div>
                    <span className="text-white ml-2">{character.stats?.speed || 0}</span>
                  </div>
                </div>
                
                {spriteErrors[character.id] && (
                  <div className="mt-2 text-red-400 text-sm">
                    Ошибка загрузки некоторых спрайтов
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Назад
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedCharacterId}
            className={`${
              selectedCharacterId 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-purple-800 cursor-not-allowed'
            } text-white font-bold py-3 px-6 rounded-lg transition-colors`}
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelect;
