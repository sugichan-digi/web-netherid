<?php

namespace App\Services;

use App\Data\CreateInquiryInput;
use App\Models\InquiryModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * お問い合わせサービス
 */
class InquiryService
{
    public function __construct(
        private readonly InquiryModel $inquiryModel,
    ) {}

    /**
     * お問い合わせ作成
     *
     * @param  CreateInquiryInput  $input  入力値オブジェクト
     * @return int 採番されたID
     * @throws \Throwable
     */
    public function createInquiry(CreateInquiryInput $input): int
    {
        try {
            return DB::transaction(function () use ($input) {
                return $this->inquiryModel->insert($input);
            });
        } catch (\Throwable $e) {
            Log::channel('error')->error('お問い合わせ登録失敗', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }   
    /**
     * 指定ユーザーのお問い合わせ履歴取得
     *
     * @param string $userId
     * @return array
     */
    public function getInquiriesByUserId(string $userId): array
    {
        return $this->inquiryModel->getByUserId($userId)->toArray();
    }
}
