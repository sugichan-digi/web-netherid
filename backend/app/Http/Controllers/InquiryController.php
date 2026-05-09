<?php

namespace App\Http\Controllers;

use App\Data\CreateInquiryInput;
use App\Services\InquiryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * お問い合わせコントローラ
 */
class InquiryController extends Controller
{
    public function __construct(
        private readonly InquiryService $inquiryService,
    ) {}

    /**
     * お問い合わせ送信
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'   => 'required|email|max:255',
            'type'    => 'required|string|max:50',
            'subject' => 'required|string|max:255',
            'body'    => 'required|string',
        ]);

        $authUser = $request->attributes->get('authUser');

        $input = new CreateInquiryInput(
            userId:  $authUser?->id,
            email:   $validated['email'],
            type:    $validated['type'],
            subject: $validated['subject'],
            body:    $validated['body'],
        );

        Log::channel('access')->info('お問い合わせ送信', [
            'email'   => $validated['email'],
            'type'    => $validated['type'],
            'user_id' => $authUser?->id,
        ]);

        $inquiryId = $this->inquiryService->createInquiry($input);

        return response()->json([
            'message'    => 'お問い合わせを受け付けました。ご入力のメールアドレス宛に控えを送信しました。',
            'inquiry_id' => $inquiryId,
        ], 201);
    }
    
    /**
     * お問い合わせ一覧取得
     */
    public function index(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('authUser');
        if (!$authUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $inquiries = $this->inquiryService->getInquiriesByUserId($authUser->id);

        return response()->json([
            'inquiries' => $inquiries,
        ]);
    }
}
