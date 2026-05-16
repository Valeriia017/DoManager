function togglePass(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("bi-eye", "bi-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("bi-eye-slash", "bi-eye");
    }
}

const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const inputs = form.querySelectorAll('input[required]');

function updateButtonState() {
    let allFilled = true;
    inputs.forEach(input => {
        if (input.value.trim() === "") allFilled = false;
    });
    submitBtn.disabled = !allFilled;
}

inputs.forEach(input => {
    input.addEventListener('input', () => {
        updateButtonState();
        const errorContainer = input.parentElement.querySelector('.error-hint');
        if (errorContainer) errorContainer.style.display = "none";
    });
});

form.onsubmit = function (e) {
    let isValid = true;
    document.querySelectorAll('.error-hint').forEach(el => el.style.display = "none");

    const email = document.getElementById('email');
    const pass1 = document.getElementById('pass1');
    const pass2 = document.getElementById('pass2');

    if (!email.value.includes('@@')) {
        document.getElementById('email-error').style.display = "block";
        isValid = false;
    }

    if (pass1.value !== pass2.value) {
        document.getElementById('pass2-error').style.display = "block";
        isValid = false;
    }

    if (!isValid) {
        e.preventDefault();
        return false;
    }
};