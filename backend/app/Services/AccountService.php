<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * アカウントサービス
 */
class AccountService
{
    /**
     * アカウント無効化（退会処理）
     * 
     * @param string $identityId KratosのIdentity ID
     * @return void
     */
    public function deactivate(string $identityId): void
    {
        $adminUrl = rtrim(config('app.kratos_admin_url'), '/');

        try {
            // 1. 現在のIdentity情報を取得
            $response = Http::get("{$adminUrl}/admin/identities/{$identityId}");
            if ($response->failed()) {
                throw new \Exception("Kratos Identityの取得に失敗しました: " . $response->body());
            }

            $identity = $response->json();

            // 2. metadata_admin に退会フラグをセット
            $metadataAdmin = $identity['metadata_admin'] ?? [];
            $metadataAdmin['deactivated_at'] = now()->toIso8601String();

            // 3. Identityを更新（stateをinactiveに設定）
            $updateResponse = Http::put("{$adminUrl}/admin/identities/{$identityId}", [
                'schema_id'      => $identity['schema_id'],
                'traits'         => $identity['traits'],
                'metadata_admin' => $metadataAdmin,
                'state'          => 'inactive', // 退会済みとしてログイン不能にする
            ]);

            if ($updateResponse->failed()) {
                throw new \Exception("Kratos Identityの更新に失敗しました: " . $updateResponse->body());
            }

            Log::channel('access')->info('ユーザー退会処理完了（フラグ付与）', [
                'kratos_identity_id' => $identityId,
            ]);

        } catch (\Throwable $e) {
            Log::channel('error')->error('退会処理エラー', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
