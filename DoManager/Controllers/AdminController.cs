using DoManager.Data;
using DoManager.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoManager.Controllers
{
    [Authorize(Roles = "Admin")] // Доступ тільки для адміна
    public class AdminController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;

        public AdminController(UserManager<ApplicationUser> userManager, ApplicationDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        // Головна сторінка з 3 блоками
        public IActionResult Index() => View();

        // 1. Сторінка керування користувачами
        public async Task<IActionResult> Users()
        {
            var users = await _userManager.Users.ToListAsync();
            return View(users);
        }

        // 2. Сторінка журналу активності
        public async Task<IActionResult> Logs()
        {
            var logs = await _context.SystemLogs
                .Include(l => l.User)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
            return View(logs);
        }

        // 3. Сторінка статистики
public async Task<IActionResult> Statistics()
{
    var users = await _userManager.Users.ToListAsync();

    ViewBag.TotalUsers = users.Count;
    ViewBag.TotalTasks = users.Sum(u => u.CreatedTasksCount);
    
    // ВАЖЛИВО: Використовуй ті самі назви, що й у View
    ViewBag.CompletedTasks = users.Sum(u => u.DoneTasksCount); // Рахуємо як DoneTasks

    ViewBag.DraftTasks = users.Sum(u => u.DraftTasksCount);
    ViewBag.InProcessTasks = users.Sum(u => u.InProcessTasksCount);
    ViewBag.EditingTasks = users.Sum(u => u.EditingTasksCount);

    return View();
}

        // Реалізація видалення користувача з підтвердженням
        [HttpPost]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return Json(new { success = false, message = "Користувача не знайдено" });

            // Видаляємо користувача
            var result = await _userManager.DeleteAsync(user);
            if (result.Succeeded)
            {
                return Json(new { success = true });
            }

            return Json(new { success = false, message = "Не вдалося видалити користувача" });
        }

        // --- РЕДАГУВАННЯ / УПРАВЛІННЯ КОРИСТУВАЧЕМ (ФОРМА) ---
        [HttpGet]
        public async Task<IActionResult> EditUser(string id)
        {
            if (string.IsNullOrEmpty(id)) return NotFound();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            return View(user);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditUser(string id, string fullName, string email, string userStatus)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return Json(new { success = false, message = "Користувача не знайдено" });

            // Захист: не дозволяємо міняти пошту чи статус головного адміна через цю форму
            if (user.Email == "admin@gmail.com" && (email != "admin@gmail.com" || userStatus != "Active"))
            {
                return Json(new { success = false, message = "Неможливо змінити критичні дані Головного Адміністратора" });
            }

            user.FullName = fullName;
            user.Email = email;
            user.UserName = email;
            user.UserStatus = userStatus;

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                // ЗАПИС У ЖУРНАЛ: логуємо дію адміна
                var log = new SystemLog
                {
                    Action = "Редагування",
                    Details = $"Адміністратор оновив дані користувача {user.Email}. Статус: {userStatus}.",
                    CreatedAt = DateTime.Now,
                    UserId = _userManager.GetUserId(User) // ID адміна, який це зробив
                };
                _context.SystemLogs.Add(log);
                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Дані користувача успішно оновлено!" });
            }

            var error = string.Join(", ", result.Errors.Select(e => e.Description));
            return Json(new { success = false, message = error });
        }

        //Метод прийому кліків
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> IncrementTaskStat(string action, string column)
        {
            var userEmail = User.Identity?.Name;
            if (string.IsNullOrEmpty(userEmail)) return Json(new { success = false });

            var user = await _userManager.FindByEmailAsync(userEmail);
            if (user == null) return Json(new { success = false });

            if (action == "create")
            {
                user.CreatedTasksCount += 1;

                // Тепер чітко перевіряємо всі 4 колонки:
                if (column == "col-draft") user.DraftTasksCount += 1;
                else if (column == "col-inprogress") user.InProcessTasksCount += 1;
                else if (column == "col-editing") user.EditingTasksCount += 1;
                else if (column == "col-done") user.DoneTasksCount += 1; // <--- Додали четверту
            }
            else if (action == "complete")
            {
                user.CompletedTasksCount += 1;
            }

            await _userManager.UpdateAsync(user);
            return Json(new { success = true });
        }
    }
}