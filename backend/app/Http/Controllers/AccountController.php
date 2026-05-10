<?php

namespace App\Http\Controllers;

use App\Services\AccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * アカウントコントローラ
 */
class AccountController extends Controller
{
    public function __construct(
        private readonly AccountService $accountService,
    ) {}

    /**
     * 退会処理（アカウント無効化）
     */
    public function deactivate(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('authUser');
        if (!$authUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $kratosIdentityId = $request->attributes->get('kratosIdentityId');
        
        if (!$kratosIdentityId) {
            return response()->json(['message' => 'Kratos Identity ID not found'], 500);
        }

        $this->accountService->deactivate($kratosIdentityId);

        return response()->json([
            'message' => '退会処理が完了しました。',
        ]);
    }
}
