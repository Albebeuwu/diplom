<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Survey extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'questions',
        'results',
        'status',
        'published_at',
        'early_access_until',
        'is_early_access',
    ];

    protected $casts = [
        'questions' => 'array',
        'results' => 'array',
        'published_at' => 'datetime',
        'early_access_until' => 'datetime',
        'is_early_access' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(SurveyResponse::class);
    }

    public function isAccessibleForUser(?User $user = null): bool
    {
        $user = $user ?? auth()->user();
        
        // Автор всегда видит свой опрос
        if ($user && $this->user_id === $user->id) {
            return true;
        }
        
        // Если опрос имеет ранний доступ
        if ($this->is_early_access && $this->early_access_until && $this->early_access_until->isFuture()) {
            // Проверяем подписку только если есть пользователь
            if (!$user) {
                return false;
            }
            
            // Убедитесь, что метод hasHypeOrHigherSubscription существует
            if (method_exists($user, 'hasHypeOrHigherSubscription')) {
                return $user->hasHypeOrHigherSubscription();
            }
            
            return false;
        }
        
        return true;
    }
    
    public function hasUserVoted($userId): bool
    {
        return $this->responses()->where('user_id', $userId)->exists();
    }
    
    public function getResultsWithPercentages(): array
    {
        $totalResponses = $this->responses()->count();
        
        if ($totalResponses === 0) {
            return $this->questions;
        }
        
        $results = [];
        
        foreach ($this->questions as $questionIndex => $question) {
            $results[$questionIndex] = $question;
            $results[$questionIndex]['votes'] = [];
            
            foreach ($question['options'] as $optionIndex => $option) {
                $voteCount = $this->responses()
                    ->whereJsonContains('answers', [
                        'question_index' => $questionIndex,
                        'option_index' => $optionIndex
                    ])
                    ->count();
                
                $percentage = ($voteCount / $totalResponses) * 100;
                
                $results[$questionIndex]['votes'][$optionIndex] = [
                    'count' => $voteCount,
                    'percentage' => round($percentage, 1)
                ];
            }
        }
        
        return $results;
    }
}