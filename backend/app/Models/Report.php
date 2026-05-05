<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'fanfic_id',
        'report_status_id',
        'reason',
        'admin_comment',
    ];

    protected $appends = ['status_name', 'status_label', 'status_color'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function fanfic()
    {
        return $this->belongsTo(Fanfic::class);
    }

    public function status()
    {
        return $this->belongsTo(ReportStatus::class, 'report_status_id');
    }

    // Аксессоры для удобства
    public function getStatusNameAttribute()
    {
        return $this->status->name ?? 'pending';
    }

    public function getStatusLabelAttribute()
    {
        return $this->status->label ?? 'На рассмотрении';
    }

    public function getStatusColorAttribute()
    {
        return $this->status->color ?? '#f59e0b';
    }
}