function postData(val, dir) {
    $.ajax({
            url: dir,
            type: 'POST',
            data: {
                'id': val
            },
            dataType: 'text'
        })
        .done(function(data, textStatus, jqXHR) {
            //成功
            //window.location.href = '/home'; // 通常の遷移
            $('#deleteSuccessModal').modal('show'); // モーダルを表示
        }).fail(function(jqXHR, textStatus, errorThrown) {
            window.location.href = '/home'; // 通常の遷移
            //失敗
            alert("サーバーに何らかの異常が発生。")
        })
        .always(function(jqXHR, textStatus) {

            //通信完了
            //alert("通信完了")
        });
}

function InputLeave(arg01, arg02, arg03Url) {
    let eleArg01 = document.getElementById(arg01);
    let eleArg02 = document.getElementById(arg02);
    if (!(eleArg01.value)) {
        eleArg02.value = null;
        eleArg02.readOnly = false;
        return;
    }



    $.ajax({
            url: arg03Url,
            type: 'POST',
            data: {
                'etymology': String(eleArg01.value)
            },
            dataType: 'text',
            async: false // ← asyncをfalseに設定する 同期処理
        })
        .done(function(data, textStatus, jqXHR) {
            //成功
            eleArg02.value = JSON.parse(data);

            if (eleArg02.value) {
                eleArg02.readOnly = true;
                return;
            }

            eleArg02.readOnly = false;
        }).fail(function(jqXHR, textStatus, errorThrown) {
            //window.location.href = '/home'; // 通常の遷移
            //失敗
            alert("サーバーに何らかの異常が発生。")
        })
        .always(function(jqXHR, textStatus) {
            //window.location.href = '/home'; // 通常の遷移
            //通信完了
            //alert("通信完了")
        });
}


document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("form");

    const validateField = (field, errorMessageText, event) => {
        if (field.value.trim() === "" || !/.*[^\s]+.*/.test(field.value)) {
            event.preventDefault(); // フォームの送信を防ぐ

            // エラーメッセージを表示
            const errorMessage = document.getElementById(`${field.name}-error-message`);
            errorMessage.textContent = errorMessageText;
            errorMessage.style.display = "block";

            // ページの一番先頭までスクロール
            window.scrollTo(0, 0);

            // フォームフィールドにフォーカスを移動
            field.focus();
        }
    };

    form.addEventListener("submit", function(event) {
        const mainWordField = document.querySelector('input[name="mainWord"]');
        validateField(mainWordField, "単語を入力してください.", event);

        const etymologyField = document.querySelector('input[name="etymology"]');
        validateField(etymologyField, "語源を入力してください.", event);
    });
});