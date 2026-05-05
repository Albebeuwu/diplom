<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaidSubscription extends Model
{
    protected $table = 'paid_subscription'; 
    
    protected $fillable = [
        'user_id',
        'plan_id',
        'plan_name',
        'price',
        'status',
        'start_date',
        'end_date',
        'transaction_id',
        'payment_method',
        'payment_details'
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'payment_details' => 'array',
        'price' => 'decimal:2'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->end_date->isFuture();
    }

    public function getDaysRemainingAttribute(): int
    {
        if (!$this->isActive()) {
            return 0;
        }
        
        return now()->diffInDays($this->end_date, false);
    }
}