import React, { useState, useEffect } from 'react';
import { commentService } from '../../../services/commentService';
import { useAuth } from '../../../context/AuthContext';
import './CommentsSection.css';

function CommentsSection({ fanficId }) {
    const { user, isAuthenticated } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [activeMenu, setActiveMenu] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadComments();
    }, [fanficId, page]);

    const loadComments = async () => {
        try {
            setLoading(true);
            const response = await commentService.getComments(fanficId, page);
            const newComments = response.data.data;

            if (page === 1) {
                setComments(newComments);
            } else {
                setComments(prev => [...prev, ...newComments]);
            }

            setHasMore(response.data.current_page < response.data.last_page);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !isAuthenticated) return;

        setSubmitting(true);
        setError('');

        try {
            const response = await commentService.addComment(fanficId, newComment);
            setComments(prev => [response.data.comment, ...prev]);
            setNewComment('');
        } catch (err) {
            setError('Ошибка при добавлении комментария');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async (commentId) => {
        if (!editContent.trim()) return;

        try {
            const response = await commentService.updateComment(commentId, editContent);
            setComments(prev =>
                prev.map(c => c.id === commentId ? response.data.comment : c)
            );
            setEditingId(null);
            setEditContent('');
        } catch {
            setError('Ошибка при обновлении комментария');
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('Вы уверены, что хотите удалить комментарий?')) return;

        try {
            await commentService.deleteComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch {
            setError('Ошибка при удалении комментария');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="comments-section">
            <h3>Комментарии ({comments.length})</h3>

            {!isAuthenticated ? (
                <div className="login-to-comment">
                    <p>🔒 Чтобы оставить комментарий, войдите в аккаунт</p>
                </div>
            ) : (
                <form className="comment-form" onSubmit={handleSubmit}>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Напишите комментарий..."
                        maxLength={2000}
                        rows={3}
                    />
                    <div className="form-footer">
                        <span className="char-counter">{newComment.length}/2000</span>
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className="submit-btn"
                        >
                            {submitting ? 'Отправка...' : 'Отправить'}
                        </button>
                    </div>
                </form>
            )}

            {error && <div className="error-message">{error}</div>}

            <div className="comments-list">
                {comments.map(comment => (
                    <div key={comment.id} className="comment-item">

                        <div className="comment-row">
                            <div className="avatar">
                                {comment.user?.name?.charAt(0) || '?'}
                            </div>

                            <div className="comment-main">
                                <div className="comment-inline">
                                    <span className="user-name">
                                        {comment.user?.name || 'Пользователь'}
                                    </span>

                                    {editingId === comment.id ? (
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="edit-inline"
                                            maxLength={2000}
                                            rows={2}
                                        />
                                    ) : (
                                        <span className="comment-text">
                                            {comment.content}
                                        </span>
                                    )}
                                </div>

                                <div className="comment-meta">
                                    <span className="comment-date">
                                        {formatDate(comment.created_at)}
                                        {comment.is_edited && ' (ред.)'}
                                    </span>

                                    {editingId === comment.id && (
                                        <button
                                            className="save-edit-btn"
                                            onClick={() => handleEdit(comment.id)}
                                        >
                                            Сохранить
                                        </button>
                                    )}
                                </div>
                            </div>

                            {user?.id === comment.user_id && editingId !== comment.id && (
                                <div className="comment-menu-wrapper">
                                    <button
                                        className="menu-btn"
                                        onClick={() =>
                                            setActiveMenu(activeMenu === comment.id ? null : comment.id)
                                        }
                                    >
                                        ⋯
                                    </button>

                                    {activeMenu === comment.id && (
                                        <div className="menu-dropdown">
                                            <button
                                                onClick={() => {
                                                    setEditingId(comment.id);
                                                    setEditContent(comment.content);
                                                    setActiveMenu(null);
                                                }}
                                            >
                                                Редактировать
                                            </button>
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <button
                        className="load-more-btn"
                        onClick={() => setPage(p => p + 1)}
                        disabled={loading}
                    >
                        {loading ? 'Загрузка...' : 'Загрузить ещё'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default CommentsSection;