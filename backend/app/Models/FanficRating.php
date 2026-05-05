<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FanficRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'min_age',
        'color',
    ];

    public function fanfics()
    {
        return $this->hasMany(Fanfic::class);
    }
}