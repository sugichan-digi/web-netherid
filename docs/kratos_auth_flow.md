# Kratos 認証フロー実装指示書

本ドキュメントは、NetherIDのフロントエンドにおいて、Ory Kratosを用いた「新規登録」および「ログイン」の標準フローを実装するAIエンジニア向けの手順・仕様書です。

## 1. 全体方針と画面遷移（UX）
セキュリティと実装のシンプルさを両立するため、Kratosの標準フロー（Registration → Verification）を採用します。

**【新規登録の画面遷移】**
1. **画面1 (新規登録)**: メールアドレス、パスワード、お名前を同時に入力して登録を実行。
2. **画面2 (認証コード確認)**: Kratosから自動送信された6桁のコードを入力してメールアドレスを検証。
3. **完了**: ダッシュボードへ自動遷移。

---

## 2. Kratosスキーマ定義の前提
Kratosの `identity.schema.json` において、ユーザーの属性（Traits）は以下のように定義されている前提でフォームを構築してください。
* `traits.email` (必須): ユーザーのメールアドレス。
* `traits.name` (必須): ユーザーの表示名（お名前・ニックネーム）。
* ※パスワードはKratosの `credentials` として自動的に要求されます。

---

## 3. 実装すべき画面とAPI連携手順

フロントエンドはビルドツールを使わず、Vanilla HTML + jQuery で実装します。Kratosとの通信時は必ず**Cookieを含める（`xhrFields: { withCredentials: true }`）**ことを忘れないでください。

### 3.1. 新規登録画面 (`frontend/auth/register/index.html`)

* **用意するUIコンポーネント**:
  * メールアドレス入力欄（`type="email"`）
  * パスワード入力欄（`type="password"`）
  * お名前入力欄（`type="text"`）
  * 「登録して認証コードを受け取る」ボタン
* **JSの連携フロー**:
  1. **Flow初期化**: ページ読み込み時に `GET <KRATOS_PUBLIC_URL>/self-service/registration/browser` を呼び出し、レスポンスから `flow.id` と `csrf_token` を取得・保持する。
  2. **登録実行**: フォーム送信時、`POST <KRATOS_PUBLIC_URL>/self-service/registration?flow=<flow.id>` に対して以下のペイロードを送信する。
     ```json
     {
       "method": "password",
       "csrf_token": "取得したトークン",
       "password": "入力されたパスワード",
       "traits": {
         "email": "入力されたメールアドレス",
         "name": "入力されたお名前"
       }
     }
     ```
  3. **遷移**: POSTリクエストが成功（200 OK）すると、バックグラウンドで認証コードのメールが送信されます。直ちに「認証コード入力画面」へリダイレクト（`window.location.href = '../verify/index.html'`）させてください。

### 3.2. 認証コード入力画面 (`frontend/auth/verify/index.html`)

* **用意するUIコンポーネント**:
  * 6桁の認証コード入力欄（`type="text" pattern="\d{6}"`）
  * 「認証する」ボタン
* **JSの連携フロー**:
  1. **Flow初期化**: ページ読み込み時に `GET <KRATOS_PUBLIC_URL>/self-service/verification/browser` を呼び出し、`flow.id` と `csrf_token` を取得・保持する。
  2. **コード検証実行**: フォーム送信時、`POST <KRATOS_PUBLIC_URL>/self-service/verification?flow=<flow.id>` に対して以下のペイロードを送信する。
     ```json
     {
       "method": "code",
       "csrf_token": "取得したトークン",
       "code": "入力された6桁コード"
     }
     ```
  3. **遷移**: 検証が成功（200 OK）すると、ユーザーの状態は「有効なセッション保持 ＆ メールアドレス検証済み」となります。ダッシュボード（`../../dashboard/index.html`）へ遷移させてください。

---

## 4. エラーハンドリングのルール
KratosのAPI（特に400系のエラー）は、`error.responseJSON.ui.nodes` の中に、どの入力フィールドでどんなエラーが起きたか（例:「パスワードが短すぎます」「このメールアドレスは既に登録されています」など）の詳細な情報が含まれます。
* jQueryの `.fail()` ブロック内でレスポンスを解析し、該当のフォーム入力欄の直下（`.form-error` クラス等）に、ユーザー向けの日本語エラーメッセージを必ず表示してください。

## 5. 参考: ログイン画面の実装 (`frontend/auth/login/index.html`)
登録完了後の通常のログインフローです。
1. **Flow初期化**: `GET <KRATOS_PUBLIC_URL>/self-service/login/browser`
2. **ログイン実行**: メールアドレスとパスワードを入力し、`POST <KRATOS_PUBLIC_URL>/self-service/login?flow=<flow.id>` へ送信。
3. **遷移**: 成功でダッシュボードへ遷移。
