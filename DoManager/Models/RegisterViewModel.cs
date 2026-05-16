using System.ComponentModel.DataAnnotations;

namespace DoManager.Models
{
    public class RegisterViewModel
    {
        [Required(ErrorMessage = "Пошта обов'язкова")]
        [EmailAddress(ErrorMessage = "Невірний формат пошти")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Вкажіть ваше ПІБ")]
        public string FullName { get; set; }

        [Required(ErrorMessage = "Пароль обов'язковий")]
        [DataType(DataType.Password)]
        public string Password { get; set; }

        [Compare("Password", ErrorMessage = "Паролі не збігаються")]
        public string ConfirmPassword { get; set; }
    }
}
