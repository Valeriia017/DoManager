using System;
using System.ComponentModel.DataAnnotations;

namespace DoManager.Models
{
    // 4 колонки дошки
    public enum KanbanStatus { Draft, InProgress, Editing, Done }
    public class TaskItem
    {
        public int Id { get; set; }
        public string Title { get; set; }       // Назва задачі
        public string? Description { get; set; } // Короткий опис
        public KanbanStatus Status { get; set; } // Статус (для колонок)

        // Блок планування дня (права панель)
        public DateTime? PlannedStartTime { get; set; } // Час початку
        public DateTime? PlannedEndTime { get; set; }   // Час завершення

        // Зв'язок з користувачем
        public string UserId { get; set; }
        public virtual ApplicationUser User { get; set; }
    }
}
