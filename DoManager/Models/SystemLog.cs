using System;

namespace DoManager.Models
{
    public class SystemLog
    {
        public int Id { get; set; }
        public string Action { get; set; }   // Дія (напр. "Реєстрація", "Блокування")
        public string Details { get; set; }  // Деталі події
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public string UserId { get; set; }
        public virtual ApplicationUser User { get; set; }
    }
}
