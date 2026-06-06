// 1. Функція імітації підтвердження пошти
function verifyEmail() {
    const statusMsg = document.getElementById('emailStatusMessage');

    // Задаємо текст і колір (темно-зелений)
    statusMsg.innerText = "Пошту підтверджено!";
    statusMsg.style.color = "#2ecc71";

    // Показуємо повідомлення
    statusMsg.style.display = 'block';

    // Ховаємо через 3 секунди
    setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
}

// 2. Функція перемикання видимості пароля (Око)
function togglePass(inputId, icon) {
    const input = document.getElementById(inputId); // Знаходимо інпут за його ID

    // Якщо тип поля "password" (приховано крапками), міняємо на "text" (видно). І навпаки.
    input.type = input.type === "password" ? "text" : "password";

    // Змінюємо саму іконку (додаємо/забираємо риску на оці)
    icon.classList.toggle("bi-eye");
    icon.classList.toggle("bi-eye-slash");
}

//  Головна функція зміни пароля (асинхронна)
async function submitPasswordChange() {
    //  Очищуємо всі старі повідомлення про помилки та успіх з попередньої спроби
    const errs = document.querySelectorAll('.profile-error-message');
    errs.forEach(el => { el.style.display = 'none'; el.innerText = ''; });

    const successAlert = document.getElementById('passwordSuccessAlert');
    successAlert.style.display = 'none';

    // Отримуємо форму та значення нових паролів
    const form = document.getElementById('changePasswordForm');
    const newPass = document.getElementById('newPass').value;
    const confirmPass = document.getElementById('confirmPass').value;

    // КЛІЄНТСЬКА ПЕРЕВІРКА: Якщо нові паролі не збігаються - навіть не турбуємо сервер
    if (newPass !== confirmPass) {
        const err = document.getElementById('error-confirmPassword');
        err.innerText = "Паролі не збігаються"; // Пишемо текст помилки
        err.style.display = 'block';            // Показуємо блок з помилкою
        return;                                 // Зупиняємо виконання функції
    }

    // ВІДПРАВКА НА СЕРВЕР: Формуємо дані та відправляємо їх у контролер
    const response = await fetch('/Account/ChangePassword', {
        method: 'POST',
        body: new FormData(form),
        // Додаємо заголовок для захисту від підробки запитів, якщо у вас увімкнено ValidateAntiForgeryToken
        headers: {
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
        }
    });

    // Очікуємо відповідь від сервера у форматі JSON
    const data = await response.json();

    //  ОБРОБКА ВІДПОВІДІ ВІД СЕРВЕРА
    if (data.success) {
        // Якщо пароль успішно змінено в базі даних
        successAlert.style.display = 'block';
        form.reset(); // Очищаємо всі поля форми

        // --- ДОДАНО: Ховаємо повідомлення через 3 секунди (3000 мілісекунд) ---
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 3000);

    } else {
        // Якщо контролер повернув помилку (наприклад, неправильний поточний пароль)
        const err = document.getElementById('error-currentPassword');
        err.innerText = data.message; // Беремо текст помилки від сервера
        err.style.display = 'block';  // Показуємо її під полем
    }
}

// 4. Функція зміни імені (асинхронна)
async function submitNameChange() {
    const form = document.getElementById('updateNameForm');
    const statusMsg = document.getElementById('nameStatusMessage');
    statusMsg.style.display = 'none'; // Ховаємо старе повідомлення

    const response = await fetch('/Account/UpdateFullName', {
        method: 'POST',
        body: new FormData(form)
    });

    const data = await response.json();
    statusMsg.innerText = data.message; // Вставляємо текст від сервера

    // Змінюємо колір залежно від результату
    if (data.success) {
        statusMsg.style.color = '#2ecc71'; // Насичений зелений для успіху

        // Беремо нове ім'я прямо з форми (шукаємо input з name="fullName")
        const newName = form.querySelector('input[name="fullName"]').value;

        // 1. Оновлюємо ім'я у картці профілю
        const profileNameSpan = document.getElementById('displayFullName');
        if (profileNameSpan) {
            profileNameSpan.innerText = newName;
        }

        // 2. Оновлюємо ім'я у шапці сайту
        const headerNameSpan = document.getElementById('headerUserFullName');
        if (headerNameSpan) {
            headerNameSpan.innerText = newName;
        }

    } else {
        statusMsg.style.color = '#ff6b6b'; // Червоний для помилки
    }

    statusMsg.style.display = 'block'; // Показуємо повідомлення

    // Ховаємо повідомлення через 3 секунди
    setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
}

// 5. Функція зміни пошти (асинхронна)
async function submitEmailChange() {
    const form = document.getElementById('updateEmailForm');
    const statusMsg = document.getElementById('emailStatusMessage');
    statusMsg.style.display = 'none'; // Ховаємо старе повідомлення

    const response = await fetch('/Account/UpdateEmail', {
        method: 'POST',
        body: new FormData(form)
    });

    const data = await response.json();
    statusMsg.innerText = data.message; // Вставляємо текст від сервера

    if (data.success) {
        statusMsg.style.color = '#2ecc71'; // Зелений

        // Оновлюємо пошту у верхньому блоці без перезавантаження
        document.getElementById('displayEmail').innerText = document.getElementById('inputEmail').value;
    } else {
        statusMsg.style.color = '#ff6b6b'; // Червоний
    }

    statusMsg.style.display = 'block'; // Показуємо повідомлення

    setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
}