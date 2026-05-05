<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReadingProgress extends Model
{
    protected $table = 'reading_progress';
    
    protected $fillable = [
        'user_id',
        'fanfic_id',
        'last_position',
        'progress_percent',
        'last_read_at'
    ];
    
    protected $casts = [
        'last_read_at' => 'datetime',
        'progress_percent' => 'integer'
    ];
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function fanfic()
    {
        return $this->belongsTo(Fanfic::class);
    }
}