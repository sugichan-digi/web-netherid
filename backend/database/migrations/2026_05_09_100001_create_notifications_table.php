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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('content')->nullable();
            $table->string('url')->nullable();
            $table->dateTime('published_at');
            $table->timestamps();

            $table->index('published_at');
        });
    }

    /**
     * テーブル削除
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
