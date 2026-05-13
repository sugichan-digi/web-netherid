$(function () {
  /* Kratos 認証フローで使用するフローIDとCSRFトークンを保持 */
  var flowId = null;
  var csrfToken = '';
  var userEmail = '';

  /* ===== URLパラメータ処理 ===== */
  // 登録画面から email をクエリパラメータで受け取り、画面上に表示する
  var params = new URLSearchParams(window.location.search);
  userEmail = params.get('email') || '';

  if (userEmail) {
    $('#js-email-display').text(userEmail);
    $('#js-email-info').show();
  }

  /* ===== 6桁コード入力UI初期化 ===== */
  // initCodeInputs が返す { getCode, clearCode } オブジェクトを保持する
  // - codeInput.getCode()    : 各セルの入力値を結合した文字列を返す
  // - codeInput.clearCode()  : 全セルをクリアして最初のセルにフォーカスする
  var codeInput = initCodeInputs('#js-code-inputs', '#js-verify-form');

  /**
   * Verificationフロー初期化
   * Kratosからフロー情報を取得し、flow.idとcsrf_tokenを保持する。
   */
  function initFlow() {
    kratosApi({ method: 'GET', path: '/self-service/verification/browser' })
      .done(function (data) {
        flowId    = data.id;
        csrfToken = extractCsrfToken(data); // ui.nodes から csrf_token 属性ノードを抽出
      })
      .fail(function (xhr) {
        // Kratos が別ページへのリダイレクトを要求する場合
        var redirect = xhr.getResponseHeader('Location') || (xhr.responseJSON && xhr.responseJSON.redirect_browser_to);
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
    $alert.removeClass('alert-success alert-info').addClass('alert alert-danger').text(message).show();
  }

  /**
   * 成功アラート表示
   * コード再送時の完了通知に使用する。
   * @param {string} message - 表示メッセージ
   */
  function showSuccess(message) {
    var $alert = $('#js-alert');
    $alert.removeClass('alert-danger alert-info').addClass('alert alert-success').text(message).show();
  }

  /**
   * 送信ボタンのローディング状態制御
   * 二重送信を防ぐためボタンを無効化し、テキストを切り替える。
   * @param {boolean} loading - ローディング中かどうか
   */
  function setLoading(loading) {
    var $btn = $('#js-submit');
    if (loading) {
      $btn.prop('disabled', true).text('確認中...');
    } else {
      $btn.prop('disabled', false).text('認証して完了する');
    }
  }

  /* ===== フォーム送信 ===== */
  $('#js-verify-form').on('submit', function (e) {
    e.preventDefault();
    $('#js-code-error').hide().text('');

    // initFlow() の非同期処理が完了していない状態での送信を防ぐ
    if (!flowId) {
      showError('認証フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var code = codeInput.getCode();
    if (code.length !== 6) {
      $('#js-code-error').text('6桁のコードを入力してください').show();
      return;
    }

    setLoading(true);

    kratosApi({
      method: 'POST',
      path: '/self-service/verification',
      params: { flow: flowId },
      data: {
        method:     'code',
        csrf_token: csrfToken,
        code:       code
      }
    })
      .done(function () {
        // 認証成功 → マイページへ遷移
        window.location.href = '/mypage/';
      })
      .fail(function (xhr) {
        setLoading(false);
        // 失敗時はコードをクリアして再入力させる
        codeInput.clearCode();

        var res = xhr.responseJSON;

        // Kratos が別ページへのリダイレクトを要求する場合
        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        // フロー期限切れ: 再送ボタンで新しいコードを取得するよう促す
        if (xhr.status === 410) {
          showError('認証フローが期限切れです。コードを再送してください。');
          flowId = null;
          initFlow();
          return;
        }

        showError(extractKratosErrorMessage(xhr, '認証コードが正しくありません。もう一度お試しください。'));
      });
  });

  /* ===== 認証コード再送 ===== */
  $('#js-resend').on('click', function () {
    var $btn = $(this);
    $btn.prop('disabled', true).text('送信中...');

    // 再送時はフローを破棄して新規に取得する（新しい CSRF トークンも必要）
    flowId = null;
    csrfToken = '';

    kratosApi({ method: 'GET', path: '/self-service/verification/browser' })
      .done(function (data) {
        flowId    = data.id;
        csrfToken = extractCsrfToken(data);
        showSuccess('認証コードを再送しました。メールをご確認ください。');
        $btn.prop('disabled', false).text('認証コードを再送する');
        codeInput.clearCode();
      })
      .fail(function () {
        showError('再送に失敗しました。しばらくしてからお試しください。');
        $btn.prop('disabled', false).text('認証コードを再送する');
      });
  });

  initFlow();
});
