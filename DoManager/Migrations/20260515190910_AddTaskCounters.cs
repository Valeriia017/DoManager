using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoManager.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskCounters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompletedTasksCount",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CreatedTasksCount",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedTasksCount",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "CreatedTasksCount",
                table: "AspNetUsers");
        }
    }
}
