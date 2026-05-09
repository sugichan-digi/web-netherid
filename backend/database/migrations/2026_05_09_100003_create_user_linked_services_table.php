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
        Schema::create('user_linked_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('service_id', 50);
            $table->foreign('service_id')->references('id')->on('services')->cascadeOnDelete();
            $table->dateTime('linked_at');
            $table->timestamps();

            $table->unique(['user_id', 'service_id']);
        });
    }

    /**
     * テーブル削除
     */
    public function down(): void
    {
        Schema::dropIfExists('user_linked_services');
    }
};
