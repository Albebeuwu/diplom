import React from 'react';
import './Pagination.css';

function Pagination({ currentPage, totalPages, onPageChange }) {
    // Функция для отображения номеров страниц
    const getPageNumbers = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        range.forEach((i) => {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        });

        return rangeWithDots;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="pagination">
            <button 
                className="pagination-button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                ←
            </button>

            {getPageNumbers().map((page, index) => (
                <button
                    key={index}
                    className={`pagination-button ${page === currentPage ? 'active' : ''}`}
                    onClick={() => typeof page === 'number' && onPageChange(page)}
                    disabled={page === '...'}
                >
                    {page}
                </button>
            ))}

            <button 
                className="pagination-button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                →
            </button>
        </div>
    );
}

export default Pagination;