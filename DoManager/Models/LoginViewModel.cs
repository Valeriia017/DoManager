using System.ComponentModel.DataAnnotations;

namespace DoManager.Models
{
    public class LoginViewModel
    {
        [Required(ErrorMessage = "Електронна пошта обов'язкова")]
        [EmailAddress(ErrorMessage = "Некоректний формат пошти")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Пароль обов'язковий")]
        [DataType(DataType.Password)]
        public string Password { get; set; }

        public bool RememberMe { get; set; }
    }
}
