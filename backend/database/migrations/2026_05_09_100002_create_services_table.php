<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * テーブル作成
     */
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('name', 100);
            $table->string('description')->nullable();
            $table->string('sso_url');
            $table->string('icon_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * テーブル削除
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
