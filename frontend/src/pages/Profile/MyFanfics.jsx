import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fanficService } from '../../services/fanficService';
import FanfikCards from '../../components/cards/FanfikCards/FanfikCards';
import { useAuth } from '../../context/AuthContext'; 
import './Profile.css';

function MyFanfics() {
    const { user } = useAuth();
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
        per_page: 6 
    });

    const loadFanfics = useCallback(async (status, page = 1) => {
        try {
            setLoading(true);
            const filterStatus = status === 'all' ? null : status;
            // Передаем параметры пагинации в сервис
            const data = await fanficService.getMyFanfics(filterStatus, page, pagination.per_page);
            
            const formattedFanfics = (Array.isArray(data.data) ? data.data : (data || [])).map(fanfic => ({
                id: fanfic.id,
                title: fanfic.title,
                author: fanfic.user?.name || user?.name || 'Аноним',
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
                per_page: pagination.per_page
            });
        } catch (error) {
            console.error('Ошибка загрузки фанфиков:', error);
            setMessage({ type: 'error', text: 'Не удалось загрузить ваши работы' });
        } finally {
            setLoading(false);
        }
    }, [pagination.per_page]);

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
        setPagination(prev => ({ ...prev, current_page: 1 }));
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
            await loadFanfics(activeFilter, pagination.current_page);
            setMessage({ type: 'success', text: 'Фанфик успешно удален' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка удаления фанфика' });
        }
    };

    const handleSubmitForReview = async (id) => {
        try {
            await fanficService.submitForReview(id);
            await loadFanfics(activeFilter, pagination.current_page);
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

    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, current_page: page }));
        loadFanfics(activeFilter, page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    return (
        <div className="my-fanfics">
            <div className="fanfics-header">
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
                        {filter.id === 'all' && filter.count !== undefined && (
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
                                        if (fanfic.customStatus === 'approved' || fanfic.customStatus === 'published') {
                                            handleFanficClick(fanfic);
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    
                    {pagination.last_page > 1 && (
                        <div className="pagination-all-table">
                            <button 
                                className="pagination-btn"
                                disabled={pagination.current_page === 1}
                                onClick={() => handlePageChange(pagination.current_page - 1)}
                            >
                                ← Назад
                            </button>
                            <div className="pagination-pages">
                                {[...Array(Math.min(5, pagination.last_page))].map((_, i) => {
                                    let pageNum;
                                    if (pagination.last_page <= 5) {
                                        pageNum = i + 1;
                                    } else if (pagination.current_page <= 3) {
                                        pageNum = i + 1;
                                    } else if (pagination.current_page >= pagination.last_page - 2) {
                                        pageNum = pagination.last_page - 4 + i;
                                    } else {
                                        pageNum = pagination.current_page - 2 + i;
                                    }
                                    
                                    if (pageNum >= 1 && pageNum <= pagination.last_page) {
                                        return (
                                            <button
                                                key={pageNum}
                                                className={`pagination-number ${pagination.current_page === pageNum ? 'active' : ''}`}
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                            <span className="pagination-info">
                                Страница {pagination.current_page} из {pagination.last_page}
                            </span>
                            <button 
                                className="pagination-btn"
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => handlePageChange(pagination.current_page + 1)}
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