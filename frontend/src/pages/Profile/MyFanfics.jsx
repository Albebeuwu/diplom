import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fanficService } from '../../services/fanficService';
import FanfikCards from '../../components/cards/FanfikCards/FanfikCards';
import './Profile.css';

function MyFanfics() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [fanfics, setFanfics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(searchParams.get('status') || 'all');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const loadFanfics = useCallback(async (status, page = 1) => {
        try {
            setLoading(true);
            const filterStatus = status === 'all' ? null : status;
            const data = await fanficService.getMyFanfics(filterStatus, page);
            
            // Форматируем данные ТОЧНО ТАК ЖЕ, как на главной странице
            const formattedFanfics = (Array.isArray(data.data) ? data.data : (data || [])).map(fanfic => ({
                id: fanfic.id,
                title: fanfic.title,
                author: fanfic.user?.name || 'Аноним',
                authorId: fanfic.user_id,
                fandom: fanfic.fandom || 'Не указан',
                description: fanfic.description || 'Без описания',
                rating: fanfic.rating?.code || fanfic.rating || 'Не указан',
                category: getCategoryFromStatus(fanfic.status),
                status: fanfic.work_status === 'in_progress' ? 'в процессе' :
                        fanfic.work_status === 'completed' ? 'завершен' : 'заброшен',
                tags: fanfic.tags?.map(tag => tag.name).join(', ') || 'Без тегов',
                likes: fanfic.likes_count ?? fanfic.likes ?? 0,
                liked: fanfic.is_liked || false,
                // ВАЖНО: правильный путь к обложке
                cover_image: fanfic.cover_image 
                    ? `http://45.147.179.241/storage/${fanfic.cover_image}`
                    : null,
                views: fanfic.views ?? 0,
                customStatus: fanfic.status,
                words_count: fanfic.words_count,
                created_at: fanfic.created_at,
                rejection_reason: fanfic.rejection_reason,
                is_early_access: fanfic.is_early_access || false,
                early_access_until: fanfic.early_access_until,
                is_exclusive: fanfic.is_exclusive || false
            }));
            
            setFanfics(formattedFanfics);
            setPagination({
                current_page: data.current_page || 1,
                last_page: data.last_page || 1,
                total: data.total || 0,
            });
        } catch (error) {
            console.error('Ошибка загрузки фанфиков:', error);
            setMessage({ type: 'error', text: 'Не удалось загрузить ваши работы' });
        } finally {
            setLoading(false);
        }
    }, []);

    const getCategoryFromStatus = (status) => {
        const categoryMap = {
            draft: 'Черновик',
            pending: 'На модерации',
            approved: 'Опубликовано',
            published: 'Опубликовано',
            rejected: 'Отклонено',
        };
        return categoryMap[status] || 'Мои работы';
    };

    useEffect(() => {
        loadFanfics(activeFilter);
    }, [activeFilter, loadFanfics]);

    const handleFilterChange = (filterId) => {
        setActiveFilter(filterId);
        setSearchParams({ tab: 'my-fanfics', status: filterId });
    };

    const handleCreateNew = () => {
        navigate('/create-fanfic');
    };

    const handleEdit = async (id) => {
        navigate(`/fanfic/${id}/edit`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот фанфик?')) {
            return;
        }
        try {
            await fanficService.deleteFanfic(id);
            await loadFanfics(activeFilter);
            setMessage({ type: 'success', text: 'Фанфик успешно удален' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка удаления фанфика' });
        }
    };

    const handleSubmitForReview = async (id) => {
        try {
            await fanficService.submitForReview(id);
            await loadFanfics(activeFilter);
            setMessage({ type: 'success', text: 'Фанфик отправлен на модерацию' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка отправки на модерацию' });
        }
    };

    const handleFanficClick = (fanfic) => {
        navigate(`/fanfic/${fanfic.id}`);
    };

    const filters = [
        { id: 'all', label: 'Все работы', count: pagination.total },
        { id: 'draft', label: 'Черновики' },
        { id: 'pending', label: 'На модерации' },
        { id: 'approved', label: 'Опубликованные' },
        { id: 'rejected', label: 'Отклоненные' },
    ];
    

    return (
        <div className="my-fanfics">
            <div className="fanfics-header">
                <h2>Мои работы</h2>
                <button className="create-btn" onClick={handleCreateNew}>
                    + Создать новый
                </button>
            </div>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="fanfics-filters">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                        onClick={() => handleFilterChange(filter.id)}
                    >
                        {filter.label}
                        {filter.count !== undefined && filter.id === 'all' && (
                            <span className="filter-count"> ({filter.count})</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading">Загрузка ваших работ...</div>
            ) : fanfics.length === 0 ? (
                <div className="no-fanfics">
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <p>У вас пока нет работ</p>
                        <button className="create-btn" onClick={handleCreateNew}>
                            Создать первый фанфик
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="favorites-list">
                        {fanfics.map(fanfic => (
                            <div key={fanfic.id} className="fanfic-card-wrapper">
                                {/* Бейджи для статуса */}
                                <div className="fanfic-badges">
                                    {fanfic.is_early_access && fanfic.early_access_until && new Date(fanfic.early_access_until) > new Date() && (
                                        <span className="premium-badge early-access-badge" title={`Ранний доступ до ${new Date(fanfic.early_access_until).toLocaleDateString()}`}>
                                            🚀 Ранний доступ
                                        </span>
                                    )}
                                    {fanfic.is_exclusive && (
                                        <span className="premium-badge exclusive-badge" title="Эксклюзивный контент">
                                            ✧˖°. Эксклюзив
                                        </span>
                                    )}
                                </div>
                                
                                {/* Причина отклонения */}
                                {fanfic.rejection_reason && (
                                    <div className="rejection-reason">
                                        <strong>Причина отклонения:</strong> {fanfic.rejection_reason}
                                    </div>
                                )}
                                
                                <FanfikCards
                                    key={fanfic.id}
                                    imageUrl={fanfic.cover_image}
                                    title={fanfic.title}
                                    author={fanfic.author}
                                    authorId={fanfic.authorId}
                                    fandom={fanfic.fandom}
                                    description={fanfic.description}
                                    rating={fanfic.rating}
                                    category={fanfic.category}
                                    showCategory={true}
                                    status={fanfic.status}
                                    tags={fanfic.tags}
                                    likes={fanfic.likes}
                                    liked={fanfic.liked}
                                    views={fanfic.views}
                                    showViews={true}
                                    onClick={() => {
                                        // Только для опубликованных разрешаем клик
                                        if (fanfic.customStatus === 'approved' || fanfic.customStatus === 'published') {
                                            handleFanficClick(fanfic);
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    
                    {pagination.last_page > 1 && (
                        <div className="pagination">
                            <button 
                                className="pagination-btn"
                                disabled={pagination.current_page === 1}
                                onClick={() => loadFanfics(activeFilter, pagination.current_page - 1)}
                            >
                                ← Назад
                            </button>
                            <span className="pagination-info">
                                Страница {pagination.current_page} из {pagination.last_page}
                            </span>
                            <button 
                                className="pagination-btn"
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => loadFanfics(activeFilter, pagination.current_page + 1)}
                            >
                                Вперед →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default MyFanfics;