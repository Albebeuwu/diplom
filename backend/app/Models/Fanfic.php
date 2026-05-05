<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use App\Services\FileProcessor;

class Fanfic extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'original_file_name',
        'extracted_text',
        'user_id',
        'rating_id',
        'status',
        'work_status',
        'fandom',
        'language',
        'words_count',
        'chapters_count',
        'views',
        'likes',
        'comments_count',
        'cover_image',
        'published_at',
        'rejection_reason',
        'previously_approved',
        'formatted_html',
        'is_early_access',
        'early_access_until',
        'is_exclusive',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'file_size' => 'integer',
        'early_access_until' => 'datetime',
        'is_early_access' => 'boolean',
        'is_exclusive' => 'boolean',
    ];
    
    protected $appends = ['file_url', 'cover_url', 'is_liked', 'likes_count' ];

    /**
     * Аксессор для URL файла в облаке
     */
    public function getFileUrlAttribute()
    {
        if (!$this->file_path) {
            return null;
        }
        
        try {
            return Storage::disk('yandex')->url($this->file_path);
        } catch (\Exception $e) {
            \Log::error('Ошибка получения URL файла', [
                'path' => $this->file_path,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Аксессор для URL обложки в облаке
     */
    public function getCoverUrlAttribute()
    {
        if (!$this->cover_image) {
            return null;
        }
        
        try {
            return Storage::disk('public')->url($this->cover_image);
        } catch (\Exception $e) {
            \Log::error('Ошибка получения URL обложки', [
                'path' => $this->cover_image,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Метод для получения содержимого файла из облака
     */
    public function getContent()
    {
        if (!$this->file_path) {
            return null;
        }

        $fileProcessor = app(\App\Services\FileProcessor::class);
        return $fileProcessor->getFileContentFromCloud($this->file_path, $this->file_type);
    }

    /**
     * Метод для получения текста для поиска
     */
    public function getSearchableText()
    {
        return $this->extracted_text ?: $this->description;
    }

    /**
     * Получить прямую ссылку на скачивание файла
     */
    public function getDownloadUrlAttribute()
    {
        if (!$this->file_path) {
            return null;
        }

        try {
            return Storage::disk('yandex')->url($this->file_path);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Проверить, требует ли файл скачивания (бинарные форматы)
     */
    public function getRequiresDownloadAttribute()
    {
        return in_array($this->file_type, ['pdf', 'docx', 'doc']);
    }

    // Остальные отношения остаются без изменений
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function rating()
    {
        return $this->belongsTo(FanficRating::class, 'rating_id');
    }

    public function tags()
    {
        return $this->belongsToMany(FanficTag::class, 'fanfic_tag');
    }

    public function chapters()
    {
        return $this->hasMany(FanficChapter::class);
    }

    // Проверка статусов
    public function isDraft()
    {
        return $this->status === 'draft';
    }

    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function isApproved()
    {
        return $this->status === 'approved';
    }

    public function isRejected()
    {
        return $this->status === 'rejected';
    }

    public function isPublished()
    {
        return $this->status === 'published' && $this->published_at !== null;
    }

    // Scope для фильтрации
    public function scopePublished($query)
    {
        return $query->where('status', 'published')
                    ->whereNotNull('published_at');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function likers()
    {
        return $this->belongsToMany(User::class, 'fanfic_likes')
                    ->withTimestamps();
    }

    public function isLikedByUser($userId = null)
    {
        if (!$userId && auth()->check()) {
            $userId = auth()->id();
        }
        
        if (!$userId) {
            return false;
        }
        
        return $this->likers()->where('user_id', $userId)->exists();
    }

    public function likedByUsers()
    {
        return $this->belongsToMany(
            \App\Models\User::class,
            'fanfic_likes',
            'fanfic_id',
            'user_id'
        );
    }

    /**
     * Проверить, лайкнул ли текущий пользователь фанфик
     */
    public function getIsLikedAttribute()
    {
        if (!auth()->check()) {
            return false;
        }
        
        return $this->likers()->where('user_id', auth()->id())->exists();
    }

    /**
     * Получить количество лайков
     */
    public function getLikesCountAttribute()
    {
        return $this->likers()->count();
    }

    public function comments()
    {
        return $this->hasMany(Comment::class)->latest();
    }

    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    public function getPreviouslyApprovedAttribute()
    {
        return $this->status === 'pending' && $this->published_at !== null;
    }

    // Проверка доступен ли фанфик для пользователя с учетом подписки
    public function isAccessibleForUser(?User $user = null): bool
    {
        $user = $user ?? Auth::user();
        
        // Если это ранний доступ
        if ($this->is_early_access && $this->early_access_until && $this->early_access_until->isFuture()) {
            // Для доступа нужна подписка Hype или выше
            if (!$user || !$user->hasHypeOrHigherSubscription()) {
                return false;
            }
        }
        
        // Если это эксклюзивный контент
        if ($this->is_exclusive) {
            if (!$user || !$user->hasHypeOrHigherSubscription()) {
                return false;
            }
        }
        
        return true;
    }
    
    // Проверка виден ли фанфик в публичном списке
    public function isVisibleInPublicList(): bool
    {
        // Ранний доступ не показываем в общем списке до окончания раннего доступа
        if ($this->is_early_access && $this->early_access_until && $this->early_access_until->isFuture()) {
            return false;
        }
        
        return $this->status === 'approved';
    }
}