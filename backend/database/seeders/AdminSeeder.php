<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;

class AdminUserSeeder extends Seeder
{
    public function run()
    {
        $admins = [
            [
                'id' => 1,
                'name' => 'Albebra',
                'email' => 'test@bk.ru',
                'role' => 'admin',
                'avatar' => 'avatars/toHDh2kAQRLSP7br3po9NdL4EwlyXltZ4bt3VD57.jpg',
                'bio' => null,
                'background_image' => 'backgrounds/XLSnm6HL4XZBvmzBkMEJyc3AteZ1lAFMZyVYp9lA.jpg',
                'background_opacity' => 1.0,
                'email_verified_at' => null,
                'password' => Hash::make('12345678'),
                'remember_token' => null,
                'blocked_at' => null,
                'block_reason' => null,
                'created_at' => Carbon::parse('2026-01-07 19:46:16'),
                'updated_at' => Carbon::parse('2026-05-03 19:10:42'),
                'subscription_plan' => 'hype',
                'subscription_until' => Carbon::parse('2026-06-02 19:10:42'),
            ]
        ];

        foreach ($admins as $admin) {
            DB::table('users')->updateOrInsert(
                ['email' => $admin['email']], // проверка по email
                $admin // данные для вставки/обновления
            );
        }
    }
}