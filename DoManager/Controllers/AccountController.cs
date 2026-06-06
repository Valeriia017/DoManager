using DoManager.Data; // ДОДАНО: підключаємо вашу папку Data, де лежить ApplicationDbContext
using DoManager.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoManager.Controllers
{
    public class AccountController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ApplicationDbContext _context; // ДОДАНО: контекст бази даних

        // Конструктор: тепер приймає ще й ApplicationDbContext
        public AccountController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _context = context; // Ініціалізуємо контекст
        }

        // --- РЕЄСТРАЦІЯ ---

        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (ModelState.IsValid)
            {
                // ЗАХИСТ: Перевіряємо, чи немає користувача з таким Email у базі
                var existingUser = await _userManager.FindByEmailAsync(model.Email);
                if (existingUser != null)
                {
                    ModelState.AddModelError(string.Empty, "Користувач з таким Email вже зареєстрований.");
                    return View(model);
                }

                var user = new ApplicationUser
                {
                    UserName = model.Email,
                    Email = model.Email,
                    FullName = model.FullName,
                    RegisteredDate = DateTime.Now,
                    UserStatus = "Active"
                };

                var result = await _userManager.CreateAsync(user, model.Password);

                if (result.Succeeded)
                {
                    // ЗАПИС У ЖУРНАЛ: логуємо успішну реєстрацію
                    var log = new SystemLog
                    {
                        Action = "Реєстрація",
                        Details = $"Новий користувач {model.Email} успішно зареєструвався в системі.",
                        CreatedAt = DateTime.Now,
                        UserId = user.Id
                    };
                    _context.SystemLogs.Add(log);
                    await _context.SaveChangesAsync();

                    await _signInManager.SignInAsync(user, isPersistent: false);
                    return RedirectToAction("Index", "Home");
                }

                // ПЕРЕКЛАДАЄМО ПОМИЛКИ НА УКРАЇНСЬКУ (якщо пароль занадто легкий)
                foreach (var error in result.Errors)
                {
                    string errorMsg = error.Description;

                    if (errorMsg.Contains("Passwords must be at least") || errorMsg.Contains("6 characters"))
                    {
                        errorMsg = "Пароль має бути не коротшим за 6 символів.";
                    }
                    else if (errorMsg.Contains("Passwords must have at least one non alphanumeric character"))
                    {
                        errorMsg = "Пароль повинен містити хоча б один спеціальний символ (наприклад: @, #, !).";
                    }
                    else if (errorMsg.Contains("Passwords must have at least one digit"))
                    {
                        errorMsg = "Пароль повинен містити хоча б одну цифру ('0'-'9').";
                    }
                    else if (errorMsg.Contains("Passwords must have at least one uppercase"))
                    {
                        errorMsg = "Пароль повинен містити великі літери (A-Z).";
                    }
                    else if (errorMsg.Contains("Passwords must have at least one lowercase"))
                    {
                        errorMsg = "Пароль повинен містити малі літери (a-z).";
                    }

                    ModelState.AddModelError(string.Empty, errorMsg);
                }
            }

            return View(model);
        }


        // --- ВХІД (LOGIN) ---
        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (ModelState.IsValid)
            {
                // 1. Спочатку просто шукаємо користувача за поштою
                var user = await _userManager.FindByEmailAsync(model.Email);

                if (user != null)
                {
                    // 2. ПЕРЕВІРКА СТАТУСУ: Якщо статус "Blocked" (або як він у вас називається)
                    // Увага: перевірте, яке саме слово ви зберігаєте в БД (Blocked, Banned, Заблокований тощо)
                    if (user.UserStatus == "Blocked")
                    {
                        // Додаємо помилку, яка виведеться на формі червоним текстом
                        ModelState.AddModelError(string.Empty, "Цей профіль тимчасово недоступний.");

                        // Записуємо спробу входу заблокованого юзера в Журнал (це буде плюсом на захисті!)
                        var banLog = new SystemLog
                        {
                            Action = "Спроба входу",
                            Details = $"Заблокований користувач {model.Email} намагався увійти в систему.",
                            CreatedAt = DateTime.Now,
                            UserId = user.Id
                        };
                        _context.SystemLogs.Add(banLog);
                        await _context.SaveChangesAsync();

                        return View(model); // Повертаємо на сторінку входу з помилкою
                    }
                }

                // 3. Якщо користувач не заблокований - перевіряємо пароль і пускаємо
                var result = await _signInManager.PasswordSignInAsync(model.Email, model.Password, false, false);

                if (result.Succeeded)
                {
                    // Ваш існуючий код для запису успішного входу в журнал...
                    if (user != null)
                    {
                        var log = new SystemLog
                        {
                            Action = "Вхід",
                            Details = $"Користувач успішно увійшов у систему.",
                            CreatedAt = DateTime.Now,
                            UserId = user.Id
                        };
                        _context.SystemLogs.Add(log);
                        await _context.SaveChangesAsync();
                    }

                    return RedirectToAction("Index", "Home");
                }

                ModelState.AddModelError("Password", "Невірний email або пароль");
            }
            return View(model);
        }

        // --- ВИХІД (LOGOUT) ---
        [HttpPost]
        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            // ЗАПИС У ЖУРНАЛ (Опціонально): логуємо вихід користувача перед очищенням кукі
            var user = await _userManager.GetUserAsync(User);
            if (user != null)
            {
                var log = new SystemLog
                {
                    Action = "Вихід",
                    Details = $"Користувач вийшов із системи.",
                    CreatedAt = DateTime.Now,
                    UserId = user.Id
                };
                _context.SystemLogs.Add(log);
                await _context.SaveChangesAsync();
            }

            await _signInManager.SignOutAsync();
            return RedirectToAction("Login", "Account");
        }

        // --- ОСОБИСТИЙ КАБІНЕТ (ПРОФІЛЬ) ---
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> Profile()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return RedirectToAction("Login");
            return View(user);
        }

        // Оновлення ПІБ
        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateFullName(string fullName)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user != null && !string.IsNullOrWhiteSpace(fullName))
            {
                user.FullName = fullName;
                var result = await _userManager.UpdateAsync(user);
                if (result.Succeeded)
                {
                    return Json(new { success = true, message = "Ім'я успешно оновлено!" });
                }
            }
            return Json(new { success = false, message = "Не вдалося оновити ім'я." });
        }

        // Оновлення Email
        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateEmail(string newEmail)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user != null && !string.IsNullOrWhiteSpace(newEmail))
            {
                user.Email = newEmail;
                user.UserName = newEmail;
                var result = await _userManager.UpdateAsync(user);
                if (result.Succeeded)
                {
                    return Json(new { success = true, message = "Email успішно оновлено!" });
                }
            }
            return Json(new { success = false, message = "Помилка при оновленні пошти." });
        }

        // Зміна пароля через 
        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ChangePassword(string currentPassword, string newPassword, string confirmPassword)
        {
            if (string.IsNullOrEmpty(currentPassword) || string.IsNullOrEmpty(newPassword) || string.IsNullOrEmpty(confirmPassword))
            {
                return Json(new { success = false, message = "Заповніть усі поля" });
            }

            if (newPassword != confirmPassword)
            {
                return Json(new { success = false, message = "Паролі не збігаються" });
            }

            var user = await _userManager.GetUserAsync(User);
            if (user != null)
            {
                var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);

                if (result.Succeeded)
                {
                    await _signInManager.RefreshSignInAsync(user);
                    return Json(new { success = true, message = "Пароль успішно змінено!" });
                }
                else
                {
                    var error = string.Join(", ", result.Errors.Select(e => e.Description));

                    if (error.Contains("Incorrect password"))
                    {
                        error = "Неправильний поточний пароль.";
                    }
                    else if (error.Contains("Passwords must be at least"))
                    {
                        error = "Новий пароль має бути не коротшим за 6 символів.";
                    }
                    else if (error.Contains("Passwords must have at least one non alphanumeric character"))
                    {
                        error = "Пароль повинен містити хоча б один спеціальний символ (наприклад: @, #, !).";
                    }
                    else if (error.Contains("Passwords must have at least one digit"))
                    {
                        error = "Пароль повинен містити хоча б одну цифру ('0'-'9').";
                    }
                    else if (error.Contains("Passwords must have at least one uppercase"))
                    {
                        error = "Пароль повинен містити великі літери (A-Z).";
                    }

                    return Json(new { success = false, message = error });
                }
            }

            return Json(new { success = false, message = "Помилка сесії. Будь ласка, перезавантажте сторінку." });
        }
    }
}