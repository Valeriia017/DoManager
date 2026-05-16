using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoManager.Migrations
{
    /// <inheritdoc />
    public partial class AddAllCounters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DoneTasksCount",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DraftTasksCount",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "EditingTasksCount",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "InProcessTasksCount",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DoneTasksCount",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DraftTasksCount",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "EditingTasksCount",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "InProcessTasksCount",
                table: "AspNetUsers");
        }
    }
}
