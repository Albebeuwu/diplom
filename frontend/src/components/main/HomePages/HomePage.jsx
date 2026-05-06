// HomePage.js - исправленная версия (только измененные части)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import CardSidebar from '../../cards/CardSidebar/CardSidebar';
import FanfikCards from '../../cards/FanfikCards/FanfikCards';
import RatingCard from '../../cards/RatingCard/RatingCard';
import { fanficService } from '../../../services/fanficService';
import { readingProgressService } from '../../../services/readingProgressService';
import { useAuth } from '../../../context/AuthContext'; 
import ReadingHistorySidebar from '../../ReadingHistorySidebar';

function HomePage() {
  const { user } = useAuth(); 
  const navigate = useNavigate();

  /* Анимация печатающегося текста */
  const words = ['ВДОХНОВЛЯЙ', 'УДИВЛЯЙ', 'ВДОХНОВЛЯЙ', 'РАДУЙ', 'ВДОХНОВЛЯЙ'];
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  /*рекомендации*/
  const [recommendedCards, setRecommendedCards] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  /* Огненные работы */
  const [fireCards, setFireCards] = useState([]); 
  const [loadingFire, setLoadingFire] = useState(true); 

  /*состояние для рейтингов из базы данных*/
  const [ratingCardsData, setRatingCardsData] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  /*продолжить чтение*/
  const [readingCards, setReadingCards] = useState([]);
  const [loadingReading, setLoadingReading] = useState(true);

  // Эффект для анимации печатающегося текста
  useEffect(() => {
    const currentWord = words[wordIndex];
    
    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentWord.length) {
          setDisplayText(currentWord.substring(0, displayText.length + 1));
          setTypingSpeed(150);
        } else {
          setTypingSpeed(2000);
          setIsDeleting(true);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(currentWord.substring(0, displayText.length - 1));
          setTypingSpeed(100);
        } else {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
          setTypingSpeed(150);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, wordIndex, words, typingSpeed]);

  // Загрузка карточек "Продолжить чтение" с реальными данными
  useEffect(() => {
      const loadReadingCards = async () => {
          try {
              setLoadingReading(true);
              
              // Получаем прогресс чтения
              const progressList = readingProgressService.getReadingCards();
              
              if (progressList.length === 0) {
                  setReadingCards([]);
                  setLoadingReading(false);
                  return;
              }
              
              // Загружаем данные для каждого фанфика
              const fanficsData = await Promise.all(
                  progressList.map(async (progress) => {
                      try {
                          // Используем метод, который НЕ увеличивает просмотры
                          const fanfic = await fanficService.getPublishedFanficNoIncrement(progress.id);
                          return {
                              id: fanfic.id,
                              title: fanfic.title,
                              description: `Глава ${progress.chapter || 'продолжение'}`,
                              likes: `${fanfic.likes || 0} лайков`,
                              avatarColor: "#670000",
                              progress: progress.progress,
                              lastReadAt: progress.lastReadAt,
                              scrollPosition: progress.scrollPosition
                          };
                      } catch (error) {
                          console.warn(`Фанфик ${progress.id} недоступен, удаляем из прогресса`);
                          readingProgressService.removeProgress(progress.id);
                          return null;
                      }
                  })
              );
              
              // Фильтруем null значения
              const validCards = fanficsData.filter(card => card !== null);
              setReadingCards(validCards);
              
          } catch (error) {
              console.error('Ошибка загрузки карточек для продолжения чтения:', error);
              setReadingCards([]);
          } finally {
              setLoadingReading(false);
          }
      };
      
      loadReadingCards();
  }, []);

  // Обработчик удаления из продолжения чтения
  const handleRemoveFromReading = (cardId) => {
    readingProgressService.removeProgress(cardId);
    // Обновляем список карточек
    setReadingCards(prev => prev.filter(card => card.id !== cardId));
  };

  // Обработчик клика по карточке продолжения чтения
  const handleReadingCardClick = (cardId) => {
    const card = readingCards.find(c => c.id === cardId);
    if (card) {
      // Переходим на страницу чтения с параметром scrollPosition
      navigate(`/fanfic/${cardId}?scrollTo=${card.scrollPosition || 0}`);
    } else {
      navigate(`/fanfic/${cardId}`);
    }
  };

  // Загрузка рекомендованных фанфиков из БД
  useEffect(() => {
    const loadRecommendedFanfics = async () => {
      try {
        setLoadingRecommended(true);
        console.log('Начало загрузки рекомендованных фанфиков...');
        
        const fanfics = await fanficService.getRecommendedFanfics(4);
        console.log('Данные с API /fanfics/recommended:', fanfics);
        
        const formattedCards = fanfics.map(fanfic => {
          console.log('Обработка фанфика:', fanfic);
          return {
            id: fanfic.id,
            title: fanfic.title,
            author: fanfic.user?.name || 'Аноним',
            fandom: fanfic.fandom || 'Не указан',
            description: fanfic.description || 'Без описания',
            rating: fanfic.rating?.code || 'Не указан',
            category: 'Для вас',
            status: fanfic.work_status === 'in_progress' ? 'в процессе' : 
                    fanfic.work_status === 'completed' ? 'завершен' : 'заброшен',
            tags: fanfic.tags?.map(tag => tag.name).join(', ') || 'Без тегов',
            likes: fanfic.likes || 0,
            views: fanfic.views ?? 0,
            liked: false,
            cover_image: fanfic.cover_image ? 
              `http://45.147.179.241/storage/${fanfic.cover_image}` : 
              null,
            user_id: fanfic.user_id,
            // ДОБАВЛЕНО: поля для эксклюзивного контента
            is_early_access: fanfic.is_early_access || false,
            early_access_until: fanfic.early_access_until,
            is_exclusive: fanfic.is_exclusive || false
          };
        });
        
        console.log('Отформатированные карточки:', formattedCards);
        setRecommendedCards(formattedCards);

        await checkLikesForFanfics(fanfics, setRecommendedCards);
        
      } catch (error) {
        console.error('Ошибка загрузки рекомендованных фанфиков:', error);
        console.error('Полная ошибка:', error.response?.data || error.message);
        setRecommendedCards([]);
      } finally {
        setLoadingRecommended(false);
      }
    };

    loadRecommendedFanfics();
  }, []);

  // Загрузка огненных работ из БД
  useEffect(() => {
    const loadFireFanfics = async () => {
      try {
        setLoadingFire(true);
        const fanfics = await fanficService.getFireFanfics(4);
        
        const formattedCards = fanfics.map(fanfic => ({
          id: fanfic.id,
          title: fanfic.title,
          author: fanfic.user?.name || 'Аноним',
          fandom: fanfic.fandom || 'Не указан',
          description: fanfic.description || 'Без описания',
          rating: fanfic.rating?.code || 'Не указан',
          category: 'Огненная работа',
          status: fanfic.work_status === 'in_progress' ? 'в процессе' : 
                  fanfic.work_status === 'completed' ? 'завершен' : 'заброшен',
          tags: fanfic.tags?.map(tag => tag.name).join(', ') || 'Без тегов',
          likes: fanfic.likes || 0,
          views: fanfic.views ?? 0,
          liked: false,
          cover_image: fanfic.cover_image ? 
            `http://45.147.179.241/storage/${fanfic.cover_image}` : 
            null,
          user_id: fanfic.user_id,
          // ДОБАВЛЕНО: поля для эксклюзивного контента
          is_early_access: fanfic.is_early_access || false,
          early_access_until: fanfic.early_access_until,
          is_exclusive: fanfic.is_exclusive || false
        }));
        
        setFireCards(formattedCards);

        await checkLikesForFanfics(fanfics, setFireCards);
        
      } catch (error) {
        console.error('Ошибка загрузки огненных работ:', error);
        setFireCards([]);
      } finally {
        setLoadingFire(false);
      }
    };

    loadFireFanfics();
  }, []);

  // Загрузка рейтингов из базы данных
  useEffect(() => {
    const loadRatings = async () => {
      try {
        const ratings = await fanficService.getRatings();
        setRatingCardsData(ratings);
      } catch (error) {
        console.error('Ошибка загрузки рейтингов:', error);
      } finally {
        setLoadingRatings(false);
      }
    };

    loadRatings();
  }, []);

  // Обработчик клика по рекомендованной карточке
  const handleCardClick = (cardId) => {
    console.log('Переход к произведению с ID:', cardId);
    navigate(`/fanfic/${cardId}`);
  };

  // Обработчик лайков
  const handleLikeClick = async (cardId, liked) => {
    try {
      if (liked) {
        await fanficService.likeFanfic(cardId);
      } else {
        await fanficService.unlikeFanfic(cardId);
      }

      const updateCards = cards =>
        cards.map(card =>
          card.id === cardId
            ? {
                ...card,
                liked,
                likes: liked
                  ? (card.likes || 0) + 1
                  : Math.max((card.likes || 0) - 1, 0)
              }
            : card
        );

      setRecommendedCards(prev => updateCards(prev));
      setFireCards(prev => updateCards(prev));

    } catch (error) {
      console.error('Ошибка при лайке:', error);
    }
  };

  // Функцию проверки лайков
  const checkLikesForFanfics = async (fanfics, setCards) => {
    try {
      const likedMap = {};

      for (const fanfic of fanfics) {
        try {
          const res = await fanficService.checkLike(fanfic.id);
          likedMap[fanfic.id] = res.liked === true;
        } catch {
          likedMap[fanfic.id] = false;
        }
      }

      setCards(prev =>
        prev.map(card => ({
          ...card,
          liked: likedMap[card.id] || false
        }))
      );
    } catch (error) {
      console.error('Ошибка проверки лайков:', error);
    }
  };

  // Обработчик клика по фанфику
  const handleFanfikClick = (card) => {
    console.log('Открыт фанфик:', card);
    navigate(`/fanfic/${card.id}`);
  };

  return (
    <div className='home-page'>
      <div className='main-head'>
        <section className="main-content">
          <img src='images/bg/home-bg.png' alt='картинка на фоне' className='background-img'/>
          <div className="content-overlay">
            <h1 className="main-title">
              <span>ЧИТАЙ.</span>
              <span>ПИШИ.</span>
              <span className="animated-word">
                <p className="word">{displayText}</p>
              </span>
            </h1>
            <h2 className="home-subtitle">Платформа, где истории не заканчиваются на 1-й главе!</h2>
          </div>
        </section>
      </div>

      <div className="recommendations">
        <ReadingHistorySidebar />
        
        <div className="story-cards-container">
          <div className="story-cards-header">
            <h2>Рекомендуемые</h2>
            <button onClick={() => navigate('/all-funfics')}>ещё</button>
          </div>
          
          <div className="for-you">
            {loadingRecommended ? (
              <>
                <FanfikCards 
                  title="Загрузка..."
                  description="Данные загружаются"
                  category="Загрузка"
                  status="загрузка"
                  tags="Загрузка"
                />
                <FanfikCards 
                  title="Загрузка..."
                  description="Данные загружаются"
                  category="Загрузка"
                  status="загрузка"
                  tags="Загрузка"
                />
                <FanfikCards 
                  title="Загрузка..."
                  description="Данные загружаются"
                  category="Загрузка"
                  status="загрузка"
                  tags="Загрузка"
                />
              </>
            ) : recommendedCards.length === 0 ? (
              <div className="no-recommendations">
                <p>Рекомендуемых произведений пока нет</p>
              </div>
            ) : (
              recommendedCards.slice(0, 3).map(card => (
                <div key={card.id} className="fanfic-card-wrapper">
                  <div className="fanfic-badges">
                    {card.is_early_access && card.early_access_until && new Date(card.early_access_until) > new Date() && (
                      <span className="premium-badge early-access-badge" title={`Ранний доступ до ${new Date(card.early_access_until).toLocaleDateString()}`}>
                        🚀 Ранний доступ
                      </span>
                    )}
                    {card.is_exclusive && (
                      <span className="premium-badge exclusive-badge" title="Эксклюзивный контент">
                        ✧˖°. Эксклюзив
                      </span>
                    )}
                  </div>
                  <FanfikCards
                    key={card.id}
                    imageUrl={card.cover_image}
                    title={card.title}
                    author={card.author}
                    authorId={card.user_id}
                    fandom={card.fandom}
                    description={card.description}
                    rating={card.rating}
                    category={card.category}
                    showCategory={true}
                    status={card.status}
                    tags={card.tags}
                    likes={card.likes}
                    liked={card.liked}
                    views={card.views}
                    showViews={true}
                    onLikeClick={(liked) => handleLikeClick(card.id, liked)}
                    onClick={() => handleFanfikClick(card)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
        <div className='home-stars'> 
          <img src='/images/icons/star1.png' className='home-star' alt='' />
          <img src='/images/icons/star2.png' className='home-star' alt='' />
        </div>
        <img src='/images/icons/girl.png' className='girl' alt='' />
      </div>
      
      <div className="fire-works">
        <div className="story-cards-header">
          <h2>Огненные работы</h2>
          <button onClick={() => navigate('/all-funfics')}>ещё</button>
        </div>
        <div className="top-fire-works">
          {loadingFire ? ( 
              <>
                <FanfikCards 
                  title="Загрузка..."
                  description="Данные загружаются"
                  category="Загрузка"
                  status="загрузка"
                  tags="Загрузка"
                />
                <FanfikCards 
                  title="Загрузка..."
                  description="Данные загружаются"
                  category="Загрузка"
                  status="загрузка"
                  tags="Загрузка"
                />
                <FanfikCards 
                  title="Загрузка..."
                  description="Данные загружаются"
                  category="Загрузка"
                  status="загрузка"
                  tags="Загрузка"
                />
                <FanfikCards 
                  title="Загрузка..."
                  description="Данные загружаются"
                  category="Загрузка"
                  status="загрузка"
                  tags="Загрузка"
                />
              </>
            ) : fireCards.length === 0 ? ( 
              <div className="no-fire-works">
                <p>Огненных работ пока нет</p>
              </div>
            ) : (
              fireCards.map(card => ( 
                // ДОБАВЛЕНО: обертка для бейджей
                <div key={card.id} className="fanfic-card-wrapper">
                  <div className="fanfic-badges">
                    {card.is_exclusive && (
                      <span className="premium-badge exclusive-badge" title="Эксклюзивный контент">
                        ✧˖°. Эксклюзив
                      </span>
                    )}
                  </div>
                  <FanfikCards
                    key={card.id}
                    imageUrl={card.cover_image}
                    title={card.title}
                    author={card.author}
                    authorId={card.user_id}
                    fandom={card.fandom}
                    description={card.description}
                    rating={card.rating}
                    category={card.category}
                    showCategory={true}
                    status={card.status}
                    tags={card.tags}
                    likes={card.likes}
                    liked={card.liked}
                    views={card.views}
                    showViews={true}
                    onLikeClick={(liked) => handleLikeClick(card.id, liked)}
                    onClick={() => handleFanfikClick(card)}
                  />
                </div>
              ))
            )}
        </div>
        <img src='/images/icons/star3.png' className='home-star-fire' alt='' />
        <img src='/images/icons/boy.png' className='boy' alt='' />
      </div> 

       <div className="rating">
        <div className="rating-header">
          <h2>Рейтинги фанфиков</h2>
          <p className="rating-subtitle">Понимание рейтинговой системы поможет выбрать подходящие произведения</p>
        </div>
        
        <div className="rating-cards-container">
          {loadingRatings ? (
            <>
              <div className="rating-card-loading">
                <div className="loading-skeleton"></div>
                <div className="loading-skeleton"></div>
              </div>
              <div className="rating-card-loading">
                <div className="loading-skeleton"></div>
                <div className="loading-skeleton"></div>
              </div>
              <div className="rating-card-loading">
                <div className="loading-skeleton"></div>
                <div className="loading-skeleton"></div>
              </div>
            </>
          ) : ratingCardsData.length === 0 ? (
            <div className="no-ratings">
              <p>Рейтинги временно недоступны</p>
            </div>
          ) : (
            ratingCardsData.map(rating => (
              <RatingCard
                key={rating.id}
                ratingCode={rating.code} 
                ratingName={rating.name} 
                description={rating.description} 
                color={rating.color} 
              />
            ))
          )}
        </div>
        
        <div className="rating-footer">
          <p className="rating-note">
            <b>Примечание:</b> Всегда обращайте внимание на рейтинг и предупреждения (теги) перед чтением.
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;