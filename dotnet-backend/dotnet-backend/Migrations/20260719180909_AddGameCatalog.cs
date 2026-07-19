using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dotnet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddGameCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Games",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NormalizedTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ReleaseDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CoverImageUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ArchivedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Games", x => x.Id);
                    table.CheckConstraint("CK_Games_ActiveLifecycle", "([IsActive] = CAST(1 AS bit) AND [ArchivedAtUtc] IS NULL) OR ([IsActive] = CAST(0 AS bit) AND [ArchivedAtUtc] IS NOT NULL)");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Games_IsActive_ReleaseDate",
                table: "Games",
                columns: new[] { "IsActive", "ReleaseDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Games_NormalizedTitle",
                table: "Games",
                column: "NormalizedTitle");

            migrationBuilder.CreateIndex(
                name: "IX_Games_NormalizedTitle_ReleaseDate",
                table: "Games",
                columns: new[] { "NormalizedTitle", "ReleaseDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Games");
        }
    }
}
