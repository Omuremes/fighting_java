import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSprites } from '../contexts/SpritesContext';

const CharacterSelect = ({ onSelectCharacter, onCancel, playerNumber = null }) => {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getCharacters } = useAuth();
  const { checkSpriteExists } = useSprites();
  
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        setLoading(true);
        const charactersList = await getCharacters();
        
        // Проверяем наличие спрайтов для каждого персонажа
        const charactersWithValidation = await Promise.all(
          charactersList.map(async (char) => {
            const spritePath = `/assets/${char.id}/Sprites/`;
            const hasSprites = await checkSpriteExists(spritePath);
            return {
              ...char,
              hasSprites,
              spritePath
            };
          })
        );
        
        setCharacters(charactersWithValidation);
        
        // По умолчанию выбираем первого персонажа с доступными спрайтами
        const firstValidCharacter = charactersWithValidation.find(char => char.hasSprites);
        if (firstValidCharacter) {
          setSelectedCharacterId(firstValidCharacter.id);
        }
      } catch (error) {
        console.error("Ошибка при загрузке персонажей:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCharacters();
  }, [getCharacters, checkSpriteExists]);
  
  const handleSelect = () => {
    const selectedCharacter = characters.find(char => char.id === selectedCharacterId);
    if (selectedCharacter) {
      onSelectCharacter({
        ...selectedCharacter,
        spritePath: `/assets/${selectedCharacter.id}/Sprites/`
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
    <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        {playerNumber ? `Игрок ${playerNumber}: Выберите персонажа` : 'Выберите персонажа'}
      </h2>
      
      {characters.length === 0 ? (
        <p className="text-center text-gray-300">Персонажи не найдены</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 mb-6">
          {characters.map((character) => (
            <div 
              key={character.id}
              className={`bg-gray-700 p-4 rounded-lg cursor-pointer transition-all
                ${selectedCharacterId === character.id 
                  ? 'border-4 border-purple-500 transform scale-105' 
                  : 'border-4 border-transparent hover:border-purple-300'}`}
              onClick={() => setSelectedCharacterId(character.id)}
            >
              <div className="flex flex-col items-center">
                <img 
                  src={character.imageUrl} 
                  alt={character.name} 
                  className="w-32 h-32 object-contain mb-2"
                />                <h3 className="text-white font-bold text-lg">{character.name}</h3>
                {character.description && (
                  <p className="text-gray-300 text-sm mt-1 mb-2">{character.description}</p>
                )}
                {character.stats && (
                  <div className="w-full mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-300 text-xs">Атака</span>
                      <div className="bg-gray-600 h-2 w-24 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500 h-full" 
                          style={{ width: `${character.stats.attack * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-red-300 ml-1">{character.stats.attack}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-300 text-xs">Защита</span>
                      <div className="bg-gray-600 h-2 w-24 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full" 
                          style={{ width: `${character.stats.defense * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-blue-300 ml-1">{character.stats.defense}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-xs">Скорость</span>
                      <div className="bg-gray-600 h-2 w-24 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-full" 
                          style={{ width: `${character.stats.speed * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-green-300 ml-1">{character.stats.speed}</span>
                    </div>
                  </div>
                )}
              </div>
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
  );
};

export default CharacterSelect;
