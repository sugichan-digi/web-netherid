$(function () {

  getSession()
    .fail(function (xhr) {
      if (xhr.status !== 401) {
        showToast('セッション情報の取得に失敗しました', 'error');
      }
    });

  $('#js-withdraw-form').on('submit', function (e) {
    e.preventDefault();

    var $btn     = $('#js-withdraw-submit-btn');
    var $formErr = $('#js-withdraw-form-error');
    var reason   = $('#withdraw-reason').val();
    var detail   = $('#withdraw-detail').val().trim();

    $('#js-reason-error').hide();
    $formErr.hide();

    if (!reason) {
      $('#js-reason-error').text('退会理由を選択してください').show();
      return;
    }

    var reasonLabels = {
      'no-use':         'サービスを使わなくなった',
      'switch-account': '別のアカウントに切り替える',
      'dissatisfied':   '機能・サービスへの不満',
      'other':          'その他'
    };
    var reasonText = reasonLabels[reason] || reason;
    var body = '退会理由: ' + reasonText + (detail ? '\n\n詳細:\n' + detail : '');

    $btn.prop('disabled', true).text('送信中...');

    getSessionSilent()
      .done(function (sessionData) {
        var email = (sessionData.identity && sessionData.identity.traits && sessionData.identity.traits.email)
          ? sessionData.identity.traits.email
          : '';

        if (!email) {
          showToast('メールアドレスが取得できません。ログインし直してください', 'error');
          $btn.prop('disabled', false).text('送信する');
          return;
        }

        api({
          method: 'POST',
          path: '/inquiries',
          data: { email: email, type: 'nether-id', subject: '退会希望', body: body },
          withAuth: true
        })
          .done(function () {
            $('#js-withdraw-form-wrap').hide();
            $('#js-withdraw-success').show();
          })
          .fail(function () {
            $formErr.text('送信に失敗しました。しばらく経ってから再度お試しください').show();
            $btn.prop('disabled', false).text('送信する');
          });
      })
      .fail(function () {
        showToast('セッションの確認に失敗しました。ログインし直してください', 'error');
        $btn.prop('disabled', false).text('送信する');
      });
  });

});
