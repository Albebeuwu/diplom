<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Fanfic;
use App\Models\FanficLike;

return new class extends Migration
{
    public function up(): void
    {
        // Синхронизируем счетчики лайков
        $fanfics = Fanfic::all();
        
        foreach ($fanfics as $fanfic) {
            $likesCount = FanficLike::where('fanfic_id', $fanfic->id)->count();
            $fanfic->likes = $likesCount;
            $fanfic->save();
        }
    }

    public function down(): void
    {
        // Нельзя откатить эту операцию
    }
};