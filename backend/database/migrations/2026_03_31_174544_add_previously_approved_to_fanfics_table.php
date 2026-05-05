<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPreviouslyApprovedToFanficsTable extends Migration
{
    public function up()
    {
        Schema::table('fanfics', function (Blueprint $table) {
            $table->boolean('previously_approved')->default(false)->after('status');
        });
    }

    public function down()
    {
        Schema::table('fanfics', function (Blueprint $table) {
            $table->dropColumn('previously_approved');
        });
    }
}