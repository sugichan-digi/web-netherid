$(function () {
  /* Kratos ログインフローで使用するフローIDとCSRFトークンを保持 */
  var flowId = null;
  var csrfToken = '';

  /**
   * Loginフロー初期化
   * Kratosからフロー情報を取得し、flow.idとcsrf_tokenを保持する。
   * セッションが既に存在する場合はマイページへリダイレクトする。
   */
  function initFlow() {
    kratosApi({ method: 'GET', path: '/self-service/login/browser' })
      .done(function (data) {
        flowId    = data.id;
        csrfToken = extractCsrfToken(data); // ui.nodes から csrf_token 属性ノードを抽出
      })
      .fail(function (xhr) {
        var res = xhr.responseJSON;

        // すでにログインしている場合: Kratos が session_already_available を返す
        if (res && res.error && res.error.id === 'session_already_available') {
          window.location.href = '/mypage/';
          return;
        }

        // Kratos が別ページへのリダイレクトを要求する場合（MFA 等）
        var redirect = xhr.getResponseHeader('Location') || (res && res.redirect_browser_to);
        if (redirect) {
          window.location.href = redirect;
        }
      });
  }

  /**
   * エラーアラート表示
   * アラートを danger スタイルで表示し、上部にスクロールして視界に入れる。
   * @param {string} message - 表示メッセージ
   */
  function showError(message) {
    var $alert = $('#js-alert');
    $alert
      .removeClass('alert-success alert-info alert-warning')
      .addClass('alert alert-danger')
      .text(message)
      .show();
    $('html, body').animate({ scrollTop: $alert.offset().top - 20 }, 200);
  }

  /**
   * 成功アラート表示
   * URLパラメータ経由で前ページから渡される完了通知（認証済み・PW再設定済み）に使用する。
   * @param {string} message - 表示メッセージ
   */
  function showSuccess(message) {
    var $alert = $('#js-alert');
    $alert
      .removeClass('alert-danger alert-info alert-warning')
      .addClass('alert alert-success')
      .text(message)
      .show();
  }

  /**
   * エラー表示クリア
   * フォーム送信前に前回のバリデーションエラーをすべてリセットする。
   */
  function hideError() {
    $('#js-alert').hide().text('');
    $('#js-email-error, #js-password-error').hide().text('');
    $('#email, #js-password').removeClass('form-input--error');
  }

  /**
   * 送信ボタンのローディング状態制御
   * 二重送信を防ぐためボタンを無効化し、テキストを切り替える。
   * @param {boolean} loading - ローディング中かどうか
   */
  function setLoading(loading) {
    var $btn = $('#js-submit');
    if (loading) {
      $btn.prop('disabled', true).text('ログイン中...');
    } else {
      $btn.prop('disabled', false).text('ログインする');
    }
  }

  /* ===== パスワード表示トグル ===== */
  $('#js-pw-toggle').on('click', function () {
    var $input = $('#js-password');
    var isPassword = $input.attr('type') === 'password';
    // type を text/password で切り替えることでブラウザのマスク表示を制御する
    $input.attr('type', isPassword ? 'text' : 'password');
    $('#js-icon-show').toggle(!isPassword);
    $('#js-icon-hide').toggle(isPassword);
  });

  /* ===== フォーム送信 ===== */
  $('#js-login-form').on('submit', function (e) {
    e.preventDefault();
    hideError();

    // initFlow() の非同期処理が完了していない状態での送信を防ぐ
    if (!flowId) {
      showError('認証フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var email    = $('#email').val().trim();
    var password = $('#js-password').val();
    var hasError = false;

    // クライアント側バリデーション（空欄チェックのみ）
    if (!email) {
      $('#js-email-error').text('メールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      hasError = true;
    }

    if (!password) {
      $('#js-password-error').text('パスワードを入力してください').show();
      $('#js-password').addClass('form-input--error');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    kratosApi({
      method: 'POST',
      path: '/self-service/login',
      params: { flow: flowId },
      data: {
        method:     'password',
        csrf_token: csrfToken,
        identifier: email,   // Kratos は email ではなく identifier フィールドを受け付ける
        password:   password
      }
    })
      .done(function () {
        // ログイン成功 → マイページへ遷移
        window.location.href = '/mypage/';
      })
      .fail(function (xhr) {
        setLoading(false);

        /* フロー期限切れ: フローIDをリセットして再初期化し、同じ画面で再試行させる */
        if (xhr.status === 410 || (xhr.responseJSON && xhr.responseJSON.error && xhr.responseJSON.error.id === 'self_service_flow_expired')) {
          showError('セッションが期限切れです。もう一度お試しください。');
          flowId = null;
          initFlow();
          return;
        }

        var res = xhr.responseJSON;

        // Kratos が別ページ（MFA 確認画面等）へのリダイレクトを要求する場合
        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        // それ以外は Kratos のエラーメッセージを表示（認証失敗など）
        showError(extractKratosErrorMessage(xhr, 'メールアドレスまたはパスワードが正しくありません。'));
      });
  });

  /* ===== URLパラメータによる通知表示 ===== */
  var params = new URLSearchParams(window.location.search);

  // メール認証完了後に /auth/verify/ から ?verified=1 で遷移してきた場合
  if (params.get('verified') === '1') {
    showSuccess('メールアドレスの認証が完了しました。ログインしてください。');
  }

  // パスワード再設定完了後に /auth/recovery/reset/ から ?reset=1 で遷移してきた場合
  if (params.get('reset') === '1') {
    showSuccess('パスワードの再設定が完了しました。新しいパスワードでログインしてください。');
  }

  initFlow();
});
