$(function () {
  /* Kratos リカバリフローで使用するフローIDとCSRFトークンを保持 */
  var flowId = null;
  var csrfToken = '';

  /**
   * Recoveryフロー初期化
   * Kratosからフロー情報を取得し、flow.idとcsrf_tokenを保持する。
   * セッションが既に存在する場合はマイページへリダイレクトする。
   */
  function initFlow() {
    kratosApi({ method: 'GET', path: '/self-service/recovery/browser' })
      .done(function (data) {
        flowId    = data.id;
        csrfToken = extractCsrfToken(data); // ui.nodes から csrf_token 属性ノードを抽出
      })
      .fail(function (xhr) {
        var res = xhr.responseJSON;

        // すでにログインしている場合: Kratos が session_already_available を返す
        if (res && res.error && res.error.id === 'session_already_available') {
          window.location.href = '/mypage/'; // ログイン済みの場合はマイページへ
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
    $alert.removeClass('alert-success alert-info').addClass('alert alert-danger').text(message).show();
    $('html, body').animate({ scrollTop: $alert.offset().top - 20 }, 200);
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
      $btn.prop('disabled', false).text('リカバリコードを送信');
    }
  }

  /* ===== フォーム送信 ===== */
  $('#js-recovery-form').on('submit', function (e) {
    e.preventDefault();
    $('#js-alert').hide();
    $('#js-email-error').hide().text('');
    $('#email').removeClass('form-input--error');

    // initFlow() の非同期処理が完了していない状態での送信を防ぐ
    if (!flowId) {
      showError('フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var email = $('#email').val().trim();

    // クライアント側バリデーション
    if (!email) {
      $('#js-email-error').text('メールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      return;
    }

    if (!isValidEmail(email)) {
      $('#js-email-error').text('有効なメールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      return;
    }

    setLoading(true);

    kratosApi({
      method: 'POST',
      path: '/self-service/recovery',
      params: { flow: flowId },
      data: {
        email: email,
        method: 'code',
        csrf_token: csrfToken
      }
    })
      .done(function () {
        // 送信成功 → コード入力画面へ遷移。flow と email を URL パラメータで引き継ぐ
        window.location.href = '/password-reset/?flow=' + encodeURIComponent(flowId) + '&email=' + encodeURIComponent(email);
      })
      .fail(function (xhr) {
        setLoading(false);

        var res = xhr.responseJSON;

        // Kratos が別ページへのリダイレクトを要求する場合
        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        // Kratos がメール送信済みを示す state を返す場合（成功扱い）
        // 存在しないメールアドレスへのリカバリ試行でも同様のレスポンスが返ることがある（情報開示防止）
        if (res && res.state === 'sent_email') {
          window.location.href = '/password-reset/?flow=' + encodeURIComponent(flowId) + '&email=' + encodeURIComponent(email);
          return;
        }

        // フロー期限切れ: フローIDをリセットして再初期化する
        if (xhr.status === 410) {
          showError('フローが期限切れです。もう一度お試しください。');
          flowId = null;
          initFlow();
          return;
        }

        showError(extractKratosErrorMessage(xhr, 'リカバリコードの送信に失敗しました。もう一度お試しください。'));
      });
  });

  initFlow();
});
