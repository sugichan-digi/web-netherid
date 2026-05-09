<?php

namespace App\Models;

use App\Data\CreateInquiryInput;
use Illuminate\Support\Facades\DB;

/**
 * お問い合わせモデル
 */
class InquiryModel
{
    /** @var string テーブル名 */
    private const TABLE = 'inquiries';

    /**
     * お問い合わせ挿入
     *
     * @param  CreateInquiryInput  $input  入力値オブジェクト
     * @return int 採番されたID
     */
    public function insert(CreateInquiryInput $input): int
    {
        return DB::table(self::TABLE)->insertGetId([
            'user_id'    => $input->userId,
            'email'      => $input->email,
            'type'       => $input->type,
            'subject'    => $input->subject,
            'body'       => $input->body,
            'status'     => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * 指定ユーザーのお問い合わせ一覧取得
     *
     * @param string $userId
     * @return \Illuminate\Support\Collection
     */
    public function getByUserId(string $userId): \Illuminate\Support\Collection
    {
        return DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
