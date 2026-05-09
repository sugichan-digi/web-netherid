$(function () {
  var flowId = null;
  var csrfToken = '';

  /**
   * Registrationフロー初期化
   * flow.idとcsrf_tokenを取得・保持する
   */
  function initFlow() {
    kratosApi({ method: 'GET', path: '/self-service/registration/browser' })
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
          window.location.href = '/mypage/';
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
   * エラー表示クリア
   */
  function hideError() {
    $('#js-alert').hide().text('');
    $('#js-email-error, #js-password-error, #js-name-error').hide().text('');
    $('#email, #js-password, #js-name').removeClass('form-input--error');
  }

  /**
   * 送信ボタンのローディング状態制御
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
    $input.attr('type', isPassword ? 'text' : 'password');
    $('#js-icon-show').toggle(!isPassword);
    $('#js-icon-hide').toggle(isPassword);
  });

  /* ===== フォーム送信 ===== */
  $('#js-register-form').on('submit', function (e) {
    e.preventDefault();
    hideError();

    if (!flowId) {
      showError('認証フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var email    = $('#email').val().trim();
    var password = $('#js-password').val();
    var name     = $('#js-name').val().trim();
    var hasError = false;

    if (!email) {
      $('#js-email-error').text('メールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $('#js-email-error').text('有効なメールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      hasError = true;
    }

    if (!password) {
      $('#js-password-error').text('パスワードを入力してください').show();
      $('#js-password').addClass('form-input--error');
      hasError = true;
    } else if (password.length < 8) {
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
          name:  name
        }
      }
    })
      .done(function () {
        window.location.href = '/auth/verify/?email=' + encodeURIComponent(email);
      })
      .fail(function (xhr) {
        setLoading(false);

        /* フロー期限切れ */
        if (xhr.status === 410) {
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

        showError(extractKratosErrorMessage(xhr, 'アカウントの作成に失敗しました。もう一度お試しください。'));
      });
  });

  initFlow();
});
