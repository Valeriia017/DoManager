using Microsoft.AspNetCore.Identity;
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace DoManager.Models
{
    public class ApplicationUser : IdentityUser
    {
        // Блок "Особистий кабінет" (Верхня частина)
        public string FullName { get; set; }        // Ім'я повне
        // Email вже є в базі

        [NotMapped]
        public string Role { get; set; }            // Роль (Адмін/Користувач)
        public string UserStatus { get; set; } = "Active"; // Статус
        public DateTime RegisteredDate { get; set; } = DateTime.Now; // Зареєстрований

        // ---- ЛІЧИЛЬНИКИ ДЛЯ АНАЛІТИКИ СИСТЕМИ (СУХІ ЦИФРИ) ----
        public int CreatedTasksCount { get; set; } = 0;   // Всього створено завдань
        public int CompletedTasksCount { get; set; } = 0; // Успішно виконано завдань

        public int DraftTasksCount { get; set; }
        public int InProcessTasksCount { get; set; }
        public int EditingTasksCount { get; set; }
        public int DoneTasksCount { get; set; } 
    }
}
