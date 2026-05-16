let userIdToDelete = '';

// Відкриття стилізованого модального вікна
function openDeleteModal(id, email) {
    userIdToDelete = id;
    document.getElementById('modalUserEmail').innerText = email;

    // Ініціалізація та показ Bootstrap модалки
    var myModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    myModal.show();
}

// Обробник кліку по кнопці остаточного видалення всередині модалки
document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
    if (!userIdToDelete) return;

    $.ajax({
        url: '/Admin/DeleteUser',
        type: 'POST',
        data: { id: userIdToDelete },
        success: function (response) {
            // Ховаємо модальне вікно
            var modalEl = document.getElementById('deleteConfirmModal');
            var modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();

            if (response.success) {
                // Анімаційне зникнення рядка користувача з таблиці
                $('#user-row-' + userIdToDelete).fadeOut(400, function () {
                    $(this).remove();
                });
            } else {
                alert(response.message || "Помилка при видаленні.");
            }
        },
        error: function () {
            alert("Помилка зв'язку з сервером.");
        }
    });
});