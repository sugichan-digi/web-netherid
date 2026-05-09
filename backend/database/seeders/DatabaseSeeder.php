<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * データベースシーダー
 */
class DatabaseSeeder extends Seeder
{
    /**
     * 初期データ投入
     */
    public function run(): void
    {
        $now = now();

        // 連携サービスマスタ
        DB::table('services')->truncate();
        DB::table('services')->insert([
            [
                'id'          => 'subscr_optimizer',
                'name'        => 'サブスク管理人',
                'description' => 'サブスクリプションを一元管理し、無駄な支出を最適化するツール。',
                'sso_url'     => 'https://subscr-optimizer.example.com/auth/sso',
                'icon_url'    => '/assets/icons/subscr_optimizer.svg',
                'is_active'   => true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'id'          => 'lunchmap',
                'name'        => 'ランチマップ',
                'description' => '現在リリース待ちです。',
                'sso_url'     => 'https://lunchmap.example.com/auth/sso',
                'icon_url'    => '/assets/icons/lunchmap.svg',
                'is_active'   => false,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
        ]);

        // お知らせ
        DB::table('notifications')->truncate();
        DB::table('notifications')->insert([
            [
                'title'        => 'NetherIDをリリースしました',
                'content'      => '共通ID管理プラットフォーム「NetherID」のベータ版提供を開始しました。対応サービスは順次拡大予定です。',
                'url'          => null,
                'published_at' => $now->copy()->subDay(),
                'created_at'   => $now->copy()->subDay(),
                'updated_at'   => $now->copy()->subDay(),
            ],
            [
                'title'        => '「サブスク管理人」との連携に対応しました',
                'content'      => 'NetherIDを使ってサブスク管理人にシングルサインオン（SSO）でログインできるようになりました。',
                'url'          => null,
                'published_at' => $now,
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
        ]);

        // 開発確認用ダミーユーザーと連携状態
        DB::table('user_linked_services')->truncate();
        DB::table('users')->truncate();

        DB::table('users')->insert([
            'id'                 => 1,
            'kratos_identity_id' => '123e4567-e89b-12d3-a456-426614174000',
            'created_at'         => $now,
            'updated_at'         => $now,
        ]);

        DB::table('user_linked_services')->insert([
            'user_id'    => 1,
            'service_id' => 'subscr_optimizer',
            'linked_at'  => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
