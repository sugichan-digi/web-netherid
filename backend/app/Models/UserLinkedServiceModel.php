<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;

/**
 * ユーザー連携状態モデル
 */
class UserLinkedServiceModel
{
    /** @var string テーブル名 */
    private const TABLE = 'user_linked_services';

    /**
     * ユーザーIDによる連携マップ取得
     *
     * @param  int  $userId  内部ユーザーID
     * @return array<string, string> ['service_id' => 'linked_at', ...]
     */
    public function findMapByUserId(int $userId): array
    {
        return DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->pluck('linked_at', 'service_id')
            ->toArray();
    }
}
