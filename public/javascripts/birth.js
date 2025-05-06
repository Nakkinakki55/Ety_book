//[JavaScript]いい感じの生年月日フォーム
//https://zenn.dev/okoe/articles/7876b897c0fccf

let userBirthdayYear = document.querySelector('.birthdayYear');
let userBirthdayMonth = document.querySelector('.birthdayMonth');
let userBirthdayDay = document.querySelector('.birthdayDay');
let dtThisYear = (new Date().getFullYear());

/**
 * selectのoptionタグを生成するための関数
 * @param {Element} elem 変更したいselectの要素
 * @param {Number} val 表示される文字と値の数値
 */
function createOptionForElements(elem, val) {
    let option = document.createElement('option');
    option.text = val;
    option.value = val;
    elem.appendChild(option);

    if (val === dtThisYear - 20) {
        //option.setAttribute("selected", true);
    }
}

//年の生成
for (let i = dtThisYear - 130; i <= dtThisYear; i++) {
    createOptionForElements(userBirthdayYear, i);
}
//月の生成
for (let i = 1; i <= 12; i++) {
    createOptionForElements(userBirthdayMonth, i);
}
//日の生成
for (let i = 1; i <= 31; i++) {
    createOptionForElements(userBirthdayDay, i);
}

/**
 * 日付を変更する関数
 */
function changeTheDay() {
    //日付の要素を削除
    userBirthdayDay.innerHTML = '';

    //選択された年月の最終日を計算
    let lastDayOfTheMonth = new Date(userBirthdayYear.value, userBirthdayMonth.value, 0).getDate();

    //選択された年月の日付を生成
    for (let i = 1; i <= lastDayOfTheMonth; i++) {
        createOptionForElements(userBirthdayDay, i);
    }
}

userBirthdayYear.addEventListener('change', function() {
    changeTheDay();
});

userBirthdayMonth.addEventListener('change', function() {
    changeTheDay();
});