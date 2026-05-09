$(function () {
  var flowId = null;
  var csrfToken = '';

  /**
   * Loginフロー初期化
   * flow.idとcsrf_tokenを取得・保持する
   */
  function initFlow() {
    kratosApi({ method: 'GET', path: '/self-service/login/browser' })
      .done(function (data) {
        flowId = data.id;
        csrfToken = '';
        if (data.ui && data.ui.nodes) {
          $.each(data.ui.nodes, function (_, node) {
            if (node.attributes && node.attributes.name === 'csrf_token') {
              csrfToken = node.attributes.value;
            }
          });
        }
      })
      .fail(function (xhr) {
        var res = xhr.responseJSON;
        
        // すでにログインしている場合（セッションが存在する場合）
        if (res && res.error && res.error.id === 'session_already_available') {
          window.location.href = '/mypage/'; // マイページへリダイレクト
          return;
        }

        var redirect = xhr.getResponseHeader('Location') || (res && res.redirect_browser_to);
        if (redirect) {
          window.location.href = redirect;
        }
      });
  }

  /**
   * エラーアラート表示
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
   */
  function hideError() {
    $('#js-alert').hide().text('');
    $('#js-email-error, #js-password-error').hide().text('');
    $('#email, #js-password').removeClass('form-input--error');
  }

  /**
   * 送信ボタンのローディング状態制御
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
    $input.attr('type', isPassword ? 'text' : 'password');
    $('#js-icon-show').toggle(!isPassword);
    $('#js-icon-hide').toggle(isPassword);
  });

  /* ===== フォーム送信 ===== */
  $('#js-login-form').on('submit', function (e) {
    e.preventDefault();
    hideError();

    if (!flowId) {
      showError('認証フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var email    = $('#email').val().trim();
    var password = $('#js-password').val();
    var hasError = false;

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
        identifier: email,
        password:   password
      }
    })
      .done(function () {
        window.location.href = '/mypage/';
      })
      .fail(function (xhr) {
        setLoading(false);

        /* フロー期限切れ */
        if (xhr.status === 410 || (xhr.responseJSON && xhr.responseJSON.error && xhr.responseJSON.error.id === 'self_service_flow_expired')) {
          showError('セッションが期限切れです。もう一度お試しください。');
          flowId = null;
          initFlow();
          return;
        }

        var res = xhr.responseJSON;

        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        showError(extractKratosErrorMessage(xhr, 'メールアドレスまたはパスワードが正しくありません。'));
      });
  });

  /* ===== URLパラメータによる通知表示 ===== */
  var params = new URLSearchParams(window.location.search);

  if (params.get('verified') === '1') {
    showSuccess('メールアドレスの認証が完了しました。ログインしてください。');
  }

  if (params.get('reset') === '1') {
    showSuccess('パスワードの再設定が完了しました。新しいパスワードでログインしてください。');
  }

  initFlow();
});
