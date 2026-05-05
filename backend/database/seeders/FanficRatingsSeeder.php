<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FanficRating;

class FanficRatingsSeeder extends Seeder
{
    public function run()
    {
        $ratings = [
            [
                'code' => 'G',
                'name' => 'General',
                'description' => 'Безобидные фанфики, в которых нет ограничений по возрасту. Подходит для всех читателей, включая детей.',
                'min_age' => 0,
                'color' => '#94D780',
            ],
            [
                'code' => 'PG',
                'name' => 'Parental Guidance',
                'description' => 'Рекомендуется читать с родителями. Может содержать легкие сцены насилия или умеренные темы.',
                'min_age' => 10,
                'color' => '#7DB56B',
            ],
            [
                'code' => 'PG-13',
                'name' => 'Parents Strongly Cautioned',
                'description' => 'Не рекомендуется детям до 13 лет. Может содержать умеренное насилие, легкий ненормативный язык или темы для взрослых.',
                'min_age' => 13,
                'color' => '#D2CA02',
            ],
            [
                'code' => 'R',
                'name' => 'Restricted',
                'description' => 'Только для читателей старше 17 лет. Содержит сцены жестокости, ненормативную лексику, откровенные сцены и т.п.',
                'min_age' => 17,
                'color' => '#CD8118',
            ],
            [
                'code' => 'NC-17',
                'name' => 'No One 17 and Under Admitted',
                'description' => 'Только для взрослых. Содержит детально прописанные откровенные сцены, чрезмерное насилие или другие материалы для взрослых.',
                'min_age' => 18,
                'color' => '#D21717',
            ],
            [
                'code' => 'NC-21',
                'name' => 'Explicit Content',
                'description' => 'Содержит подробно прописанные черезмерно жестокие сцены. Только для совершеннолетних читателей. Строго 18+.',
                'min_age' => 21,
                'color' => '#670000',
            ],
        ];

        foreach ($ratings as $rating) {
            FanficRating::create($rating);
        }
    }
}