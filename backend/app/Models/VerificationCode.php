<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class VerificationCode extends Model
{
    protected $table = 'verification_codes';
    
    protected $fillable = [
        'email',
        'code',
        'type',
        'expires_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime'
    ];
    
    // Проверка, не истек ли код
    public function isValid(): bool
    {
        return Carbon::now()->lt($this->expires_at);
    }

    public static function generateCode($email, $type = 'registration'): self
    {
        // Удаляем старые коды для этого email и типа
        self::where('email', $email)
            ->where('type', $type)
            ->delete();

        // Генерируем 6-значный код
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        // Сохраняем в БД с сроком жизни 15 минут
        return self::create([
            'email' => $email,
            'code' => $code,
            'type' => $type,
            'expires_at' => Carbon::now()->addMinutes(15)
        ]);
    }
}