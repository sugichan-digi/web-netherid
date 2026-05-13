# ねざーID 連携指示書（新サービス開発用）

このドキュメントは、ねざーID（NetherID）と連携した新しいサービスを開発する際に、AIエンジニアへ渡す前提条件・実装ルールです。
**新しいサービスのフロントエンドを実装する前に、必ずこのドキュメントを読んでください。**

---

## 1. ねざーIDとは

「ねざーID」は、複数のサービスで共通して使える統合アカウント基盤（SSO）です。
認証エンジンには **Ory Kratos** を採用しています。

- ユーザーは **ねざーID** に一度登録すれば、連携サービスをそのアカウントで利用できます。
- 新サービスが独自のユーザー登録・ログイン機能を持つことは**禁止**です。必ずねざーIDと連携してください。

---

## 2. 絶対的ルール

| ルール | 内容 |
|--------|------|
| 独自認証の実装禁止 | 独自のユーザー登録・ログイン・パスワード管理は一切実装しない |
| 新規登録 | 必ず `https://netherid.com/register` へリダイレクトする |
| ログイン | Kratos (`auth.netherid.com`) を通じて認証を行う |
| セッション確認 | `common.js` の `getSession()` / `getSessionSilent()` を必ず利用する |
| ログアウト | `common.js` の `performLogout()` を必ず利用する |

---

## 3. 接続先URL・設定値

```js
// common.js から引用（変更しないこと）
var KRATOS_BASE = 'https://auth.netherid.com';  // Ory Kratos のベースURL
var API_BASE    = 'https://api.netherid.com';   // ねざーID バックエンドAPI のベースURL
```

新サービスが独自のバックエンドAPIを持つ場合は、別途 `API_BASE` に相当する変数を定義してください。
ただし Kratos への通信は必ず上記 `KRATOS_BASE` を使います。

---

## 4. 新規登録の実装

新サービスの画面に「新規登録」ボタン・リンクを設ける場合、**ねざーIDの登録ページへリダイレクト**します。
独自の登録フォームは実装しません。

```js
// 新規登録ボタンのリンク先
window.location.href = 'https://netherid.com/register';
```

または HTML で直接リンクを設定する場合：

```html
<a href="https://netherid.com/register">新規登録（ねざーID）</a>
```

---

## 5. ログインの実装

ログイン画面は Kratos の Browser Flow を利用して実装します。
`common.js` の `kratosApi()` 関数で通信してください。

### 5.1 ログインフロー

```
1. ページ読み込み時:
   GET /self-service/login/browser
   → flow.id と csrf_token を取得・保持

2. フォーム送信時:
   POST /self-service/login?flow=<flow.id>
   Body: {
     "method": "password",
     "csrf_token": "<取得したトークン>",
     "identifier": "<メールアドレス>",
     "password": "<パスワード>"
   }

3. 成功時: サービスのダッシュボード（またはトップページ）へ遷移
```

### 5.2 実装サンプル

```js
$(function () {
  var flowId = '';

  // Flow 初期化
  kratosApi({ method: 'GET', path: '/self-service/login/browser' })
    .done(function (data) {
      flowId = data.id;
      // CSRF トークンは extractCsrfToken(data) で取得できる
    })
    .fail(function (xhr) {
      // session_already_available の場合はすでにログイン済み
      if (xhr.responseJSON && xhr.responseJSON.error &&
          xhr.responseJSON.error.id === 'session_already_available') {
        window.location.href = '/dashboard/';
      }
    });

  // フォーム送信
  $('#js-login-form').on('submit', function (e) {
    e.preventDefault();
    kratosApi({
      method: 'POST',
      path: '/self-service/login?flow=' + flowId,
      data: {
        method: 'password',
        csrf_token: extractCsrfToken(/* 保持している flowData */),
        identifier: $('#email').val(),
        password: $('#password').val()
      }
    })
    .done(function () {
      window.location.href = '/dashboard/';
    })
    .fail(function (xhr) {
      showAlert('#js-error', extractKratosErrorMessage(xhr), 'error');
    });
  });
});
```

---

## 6. セッション管理

### 6.1 認証必須ページ（未ログインならログインページへ飛ばす）

```js
$(function () {
  getSession().done(function (data) {
    // data.identity.id      → ユーザーID（UUID）
    // data.identity.traits.email → メールアドレス
    // data.identity.traits.name  → 表示名
    var identity = data.identity || {};
    var email = (identity.traits || {}).email || '';
    // ページの初期化処理...
  });
  // 401 が返った場合は getSession() が自動で /login/ へリダイレクトする
});
```

### 6.2 ログイン状態の確認のみ（リダイレクト不要）

```js
getSessionSilent()
  .done(function (data) {
    // ログイン済み
  })
  .fail(function () {
    // 未ログイン → ゲスト向けUIを表示するなど
  });
```

### 6.3 ログアウト

```js
performLogout(); // Kratos のログアウトフローを実行後、/login/ へ遷移する
```

---

## 7. common.js の配置・読み込みルール

新サービスの `common.js` には、ねざーID の `common.js` が提供する以下の関数を**必ずコピーまたは共有して利用**してください。

| 関数名 | 用途 |
|--------|------|
| `kratosApi(options)` | Kratos への通信（withCredentials 付き） |
| `api(options)` | バックエンドAPIへの通信（withCredentials 付き） |
| `getSession()` | セッション取得（未認証時は `/login/` へリダイレクト） |
| `getSessionSilent()` | セッション取得（リダイレクトなし） |
| `performLogout()` | ログアウト処理 |
| `extractCsrfToken(flowData)` | Kratos フローから csrf_token を抽出 |
| `extractKratosErrorMessage(xhr, fallback)` | Kratos エラーを日本語に変換 |
| `showToast(message, type)` | トースト通知 |
| `showAlert(selector, message, type)` | インラインアラート表示 |

ねざーIDプロジェクトの `frontend/common.js` が正となるソースです。

---

## 8. Kratos エラーハンドリング

- エラー時は `extractKratosErrorMessage(xhr, fallback)` を使って日本語メッセージに変換する。
- エラーメッセージは `showAlert()` でフォーム直下に表示するか、`showToast()` で通知する。
- `KRATOS_ERROR_MESSAGES` と `KRATOS_ERROR_ID_MESSAGES` に対応表がある（`common.js` 参照）。

---

## 9. ログインページのURL規則

新サービスでも未認証リダイレクト先は `/login/` に統一してください（`getSession()` のデフォルト動作）。
新サービスのログインページは `/login/index.html` として実装します。

---

## 10. 参照すべき関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/kratos_auth_flow.md` | Kratos 登録・認証コード検証・ログインの詳細フロー |
| `frontend/common.js` | 共通関数の実装ソース（正） |
| `.claude/frontend.md` | フロントエンドコーディングルール |
| `.claude/design-system.md` | UIデザインシステムルール |
