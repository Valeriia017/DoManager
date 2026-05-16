using Microsoft.AspNetCore.Identity;
using DoManager.Models;

namespace DoManager.Models
{
    public static class DbInitializer
    {
        public static async Task SeedAdminUserAsync(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            //  Створюємо ролі
            if (!await roleManager.RoleExistsAsync("Admin"))
            {
                await roleManager.CreateAsync(new IdentityRole("Admin"));
            }

            //  Дані адміна 
            string adminEmail = "admin@gmail.com"; // Пошта 
            string adminPassword = "Admin_12"; //  ПАРОЛЬ

            var adminUser = await userManager.FindByEmailAsync(adminEmail);

            if (adminUser == null)
            {
                var newAdmin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "Головний Адміністратор",
                    UserStatus = "Active",
                    RegisteredDate = DateTime.Now,
                    EmailConfirmed = true
                };

                // Створюємо адміна в базі
                var result = await userManager.CreateAsync(newAdmin, adminPassword);

                if (result.Succeeded)
                {
                    // Призначаємо йому роль Admin
                    await userManager.AddToRoleAsync(newAdmin, "Admin");
                }
            }
        }
    }
}