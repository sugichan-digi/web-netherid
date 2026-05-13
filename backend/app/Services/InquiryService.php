<?php

namespace App\Services;

use App\Data\CreateInquiryInput;
use App\Mail\InquiryNotificationMail;
use App\Models\InquiryModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * お問い合わせサービス
 */
class InquiryService
{
    public function __construct(
        private readonly InquiryModel $inquiryModel,
    ) {}

    /**
     * お問い合わせ作成・管理者通知メール送信
     *
     * @param  CreateInquiryInput  $input  入力値オブジェクト
     * @return int 採番されたID
     * @throws \Throwable
     */
    public function createInquiry(CreateInquiryInput $input): int
    {
        try {
            $inquiryId = DB::transaction(function () use ($input) {
                return $this->inquiryModel->insert($input);
            });
        } catch (\Throwable $e) {
            Log::channel('error')->error('お問い合わせ登録失敗', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);
            throw $e;
        }

        $adminAddress = config('mail.admin_address');
        if ($adminAddress) {
            try {
                Mail::to($adminAddress)->send(new InquiryNotificationMail($input, $inquiryId));
                Log::channel('access')->info('お問い合わせ通知メール送信', ['inquiry_id' => $inquiryId]);
            } catch (\Throwable $e) {
                Log::channel('error')->error('お問い合わせ通知メール送信失敗', [
                    'inquiry_id' => $inquiryId,
                    'message'    => $e->getMessage(),
                    'trace'      => $e->getTraceAsString(),
                ]);
            }
        }

        return $inquiryId;
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
