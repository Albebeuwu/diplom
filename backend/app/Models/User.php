<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Storage;
class User extends Authenticatable
{
    protected $appends = ['avatar_url', 'background_url', 'is_blocked'];
    
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
        'bio',
        'background_image', 
        'background_opacity',
        'blocked_at', 
        'block_reason', 
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'blocked_at' => 'datetime', 
    ];

    // Аксессор для проверки заблокирован ли пользователь
    public function getIsBlockedAttribute()
    {
        return $this->blocked_at !== null;
    }

    // Аксессор для получения URL аватарки
    public function getAvatarUrlAttribute()
    {
        if ($this->avatar) {
            return Storage::url($this->avatar);
        }
        
        return $this->generateAvatar();
    }

    // Аксессор для URL фона:
    public function getBackgroundUrlAttribute()
    {
        if ($this->background_image) {
            return Storage::url($this->background_image);
        }
        
        return null;
    }

    // Генерация аватарки с инициалами
    private function generateAvatar()
    {
        $colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 
            'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
            'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
        ];
        
        $name = $this->name ?: 'U';
        $initials = strtoupper(substr($name, 0, 1));
        $colorIndex = crc32($name) % count($colors);
        $color = $colors[$colorIndex];
        
        return 'data:image/svg+xml;utf8,' . rawurlencode(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="' . $this->getColorHex($color) . '"/>
                <text x="50" y="55" font-family="Arial" font-size="40" fill="white" 
                      text-anchor="middle" dominant-baseline="middle">' . $initials . '</text>
            </svg>'
        );
    }

    private function getColorHex($colorClass)
    {
        $colorMap = [
            'bg-red-500' => '#ef4444',
            'bg-blue-500' => '#3b82f6',
            'bg-green-500' => '#10b981',
            'bg-yellow-500' => '#f59e0b',
            'bg-purple-500' => '#8b5cf6',
            'bg-pink-500' => '#ec4899',
            'bg-indigo-500' => '#6366f1',
            'bg-teal-500' => '#14b8a6',
            'bg-orange-500' => '#f97316',
        ];
        
        return $colorMap[$colorClass] ?? '#6b7280';
    }

    // Скоупы для удобной фильтрации
    public function scopeActive($query)
    {
        return $query->whereNull('blocked_at');
    }

    public function scopeBlocked($query)
    {
        return $query->whereNotNull('blocked_at');
    }

    public function fanfics()
    {
        return $this->hasMany(Fanfic::class);
    }

    public function likedFanfics()
    {
        return $this->belongsToMany(Fanfic::class, 'fanfic_likes')
            ->withTimestamps();
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    /**
     * Подписки пользователя (на кого подписан)
     */
    public function subscriptions()
    {
        return $this->hasMany(Subscription::class, 'user_id');
    }

    /**
     * Подписчики пользователя (кто подписан на него)
     */
    public function subscribers()
    {
        return $this->hasMany(Subscription::class, 'author_id');
    }

    /**
     * Проверить, подписан ли пользователь на другого пользователя
     */
    public function isSubscribedTo($authorId)
    {
        return $this->subscriptions()
            ->where('author_id', $authorId)
            ->exists();
    }

    /**
     * Проверка наличия подписки Hype или выше
     */
    public function hasHypeOrHigherSubscription(): bool
    {
        if (!$this->id) {
            return false;
        }

        $exists = $this->paidSubscriptions()
            ->where('status', 'active')
            ->where('end_date', '>', now())
            ->whereIn('plan_id', ['hype', 'chitun'])
            ->exists();

        return $exists;
    }
    
    /**
     * Получение активной платной подписки
     */
    public function getActivePaidSubscription(): ?PaidSubscription
    {
        return $this->paidSubscriptions()
            ->where('status', 'active')
            ->where('end_date', '>', now())
            ->first();
    }
    
    /**
     * Получение уровня подписки
     */
    public function getSubscriptionLevel(): string
    {
        $subscription = $this->paidSubscriptions()
            ->where('status', 'active')
            ->where('end_date', '>', now())
            ->latest('end_date')
            ->first();

        return $subscription?->plan_id ?? 'free';
    }
    
    public function paidSubscriptions()
    {
        return $this->hasMany(PaidSubscription::class);
    }

}