<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    
    public function up(): void
    {
        Schema::create('paid_subscription', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('plan_id'); // base, hype, chitun
            $table->string('plan_name');
            $table->decimal('price', 10, 2);
            $table->string('status')->default('active'); // active, expired, cancelled
            $table->timestamp('start_date');
            $table->timestamp('end_date');
            $table->string('transaction_id')->unique();
            $table->string('payment_method')->default('bank_card');
            $table->json('payment_details')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index('end_date');
        });
    }

    
    public function down(): void
    {
        Schema::dropIfExists('paid_subscription');
    }
};
