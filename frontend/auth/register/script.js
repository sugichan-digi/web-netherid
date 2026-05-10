$(function () {
  /* Kratos 登録フローで使用するフローIDとCSRFトークンを保持 */
  var flowId = null;
  var csrfToken = '';

  /**
   * Registrationフロー初期化
   * Kratosからフロー情報を取得し、flow.idとcsrf_tokenを保持する。
   * セッションが既に存在する場合はマイページへリダイレクトする。
   */
  function initFlow() {
    kratosApi({ method: 'GET', path: '/self-service/registration/browser' })
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

        // Kratos が別ページへのリダイレクトを要求する場合
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
   * エラー表示クリア
   * フォーム送信前に前回のバリデーションエラーをすべてリセットする。
   */
  function hideError() {
    $('#js-alert').hide().text('');
    $('#js-email-error, #js-password-error, #js-name-error').hide().text('');
    $('#email, #js-password, #js-name').removeClass('form-input--error');
  }

  /**
   * 送信ボタンのローディング状態制御
   * 二重送信を防ぐためボタンを無効化し、テキストを切り替える。
   * @param {boolean} loading - ローディング中かどうか
   */
  function setLoading(loading) {
    var $btn = $('#js-submit');
    if (loading) {
      $btn.prop('disabled', true).text('送信中...');
    } else {
      $btn.prop('disabled', false).text('登録して認証コードを受け取る');
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
  $('#js-register-form').on('submit', function (e) {
    e.preventDefault();
    hideError();

    // initFlow() の非同期処理が完了していない状態での送信を防ぐ
    if (!flowId) {
      showError('認証フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var email    = $('#email').val().trim();
    var password = $('#js-password').val();
    var name     = $('#js-name').val().trim();
    var hasError = false;

    // クライアント側バリデーション
    if (!email) {
      $('#js-email-error').text('メールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      hasError = true;
    } else if (!isValidEmail(email)) {
      // 形式チェックは登録時のみ行う（ログインは Kratos 側に委ねる）
      $('#js-email-error').text('有効なメールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      hasError = true;
    }

    if (!password) {
      $('#js-password-error').text('パスワードを入力してください').show();
      $('#js-password').addClass('form-input--error');
      hasError = true;
    } else if (password.length < 8) {
      // Kratos の最低文字数要件と一致させる
      $('#js-password-error').text('パスワードは8文字以上で入力してください').show();
      $('#js-password').addClass('form-input--error');
      hasError = true;
    }

    if (!name) {
      $('#js-name-error').text('お名前を入力してください').show();
      $('#js-name').addClass('form-input--error');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    kratosApi({
      method: 'POST',
      path: '/self-service/registration',
      params: { flow: flowId },
      data: {
        method:     'password',
        csrf_token: csrfToken,
        password:   password,
        traits: {
          email: email,
          name:  name  // Kratos identity schema の traits.name に格納される
        }
      }
    })
      .done(function () {
        // 登録成功 → メール認証画面へ遷移。入力したメールアドレスを URL パラメータで引き継ぐ
        window.location.href = '/auth/verify/?email=' + encodeURIComponent(email);
      })
      .fail(function (xhr) {
        setLoading(false);

        /* フロー期限切れ: フローIDをリセットして再初期化し、同じ画面で再試行させる */
        if (xhr.status === 410) {
          showError('セッションが期限切れです。もう一度お試しください。');
          flowId = null;
          initFlow();
          return;
        }

        var res = xhr.responseJSON;

        // Kratos が別ページへのリダイレクトを要求する場合
        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        // メール重複等、Kratos が返す具体的なエラーメッセージを表示する
        showError(extractKratosErrorMessage(xhr, 'アカウントの作成に失敗しました。もう一度お試しください。'));
      });
  });

  initFlow();
});
