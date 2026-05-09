<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;

/**
 * ユーザーマッピングモデル
 */
class UserModel
{
    /** @var string テーブル名 */
    private const TABLE = 'users';

    /**
     * IDによるユーザー取得
     *
     * @param  int  $id  内部ユーザーID
     * @return object|null
     */
    public function findById(int $id): ?object
    {
        return DB::table(self::TABLE)
            ->where('id', $id)
            ->select(['id', 'kratos_identity_id'])
            ->first();
    }

    /**
     * Kratos Identity IDによるユーザー取得
     *
     * @param  string  $kratosIdentityId  KratosのIdentity UUID
     * @return object|null
     */
    public function findByKratosId(string $kratosIdentityId): ?object
    {
        return DB::table(self::TABLE)
            ->where('kratos_identity_id', $kratosIdentityId)
            ->first();
    }

    /**
     * ユーザー挿入
     *
     * @param  string  $kratosIdentityId  KratosのIdentity UUID
     * @return int 採番されたID
     */
    public function insert(string $kratosIdentityId): int
    {
        return DB::table(self::TABLE)->insertGetId([
            'kratos_identity_id' => $kratosIdentityId,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);
    }
}
