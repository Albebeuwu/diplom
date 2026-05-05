<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory;
    
    protected $table = 'subscriptions';
    
    protected $fillable = [
        'user_id',
        'author_id'
    ];
    
    public $timestamps = false; // Если используем только created_at
    
    // Если хотим использовать timestamps
    // const CREATED_AT = 'created_at';
    // const UPDATED_AT = null;
    
    /**
     * Пользователь, который подписался
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
    /**
     * Автор, на которого подписались
     */
    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}