<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: sans-serif; color: #333; background: #f5f5f5; padding: 24px; }
        .card { background: #fff; border-radius: 8px; padding: 24px; max-width: 640px; margin: 0 auto; }
        h2 { font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; border: 1px solid #e0e0e0; vertical-align: top; font-size: 14px; }
        th { background: #f0f0f0; white-space: nowrap; width: 140px; }
        .body-cell { white-space: pre-wrap; word-break: break-word; }
        .footer { margin-top: 16px; font-size: 12px; color: #999; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <h2>新しいお問い合わせが届きました</h2>
        <table>
            <tr>
                <th>問い合わせID</th>
                <td>#{{ $inquiryId }}</td>
            </tr>
            <tr>
                <th>種別</th>
                <td>{{ $type }}</td>
            </tr>
            <tr>
                <th>件名</th>
                <td>{{ $subject }}</td>
            </tr>
            <tr>
                <th>送信者メール</th>
                <td><a href="mailto:{{ $senderEmail }}">{{ $senderEmail }}</a></td>
            </tr>
            <tr>
                <th>ユーザーID</th>
                <td>{{ $userId ?? '未ログイン' }}</td>
            </tr>
            <tr>
                <th>本文</th>
                <td class="body-cell">{{ $body }}</td>
            </tr>
        </table>
        <p class="footer">NetherID お問い合わせ通知システム</p>
    </div>
</body>
</html>
