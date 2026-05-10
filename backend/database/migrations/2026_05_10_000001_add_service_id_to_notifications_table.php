<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * サービス区分カラム追加
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('service_id', 50)->nullable()->after('content');
        });
    }

    /**
     * サービス区分カラム削除
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn('service_id');
        });
    }
};
