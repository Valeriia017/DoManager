async function submitUserEdit() {
    const form = document.getElementById('editUserForm');
    const statusMsg = document.getElementById('statusMessage');
    statusMsg.style.display = 'none';

    const response = await fetch('/Admin/EditUser', {
        method: 'POST',
        body: new FormData(form)
    });

    const data = await response.json();
    statusMsg.innerText = data.message;

    if (data.success) {
        statusMsg.style.color = '#2ecc71';
    } else {
        statusMsg.style.color = '#ff6b6b';
    }

    statusMsg.style.display = 'block';

    if (data.success) {
        setTimeout(() => {
            window.location.href = '/Admin/Users';
        }, 1200);
    }
}