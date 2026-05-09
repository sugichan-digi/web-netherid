<?php

namespace App\Models;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * 連携サービスマスタモデル
 */
class ServiceModel
{
    /** @var string テーブル名 */
    private const TABLE = 'services';

    /**
     * サービス全件取得
     *
     * @return Collection
     */
    public function findAll(): Collection
    {
        return DB::table(self::TABLE)
            ->orderByDesc('is_active')
            ->orderBy('id')
            ->select(['id', 'name', 'description', 'sso_url', 'icon_url', 'is_active'])
            ->get();
    }
}
