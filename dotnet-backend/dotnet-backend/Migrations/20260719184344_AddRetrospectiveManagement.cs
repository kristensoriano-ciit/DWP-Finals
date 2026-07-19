using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dotnet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRetrospectiveManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Retrospectives",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GameId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ReviewContent = table.Column<string>(type: "nvarchar(max)", maxLength: 20000, nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    UnpublishedReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    PublishedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UnpublishedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Retrospectives", x => x.Id);
                    table.CheckConstraint("CK_Retrospectives_ArchivedLifecycle", "([Status] = 'Archived' AND [ArchivedAtUtc] IS NOT NULL) OR ([Status] <> 'Archived' AND [ArchivedAtUtc] IS NULL)");
                    table.CheckConstraint("CK_Retrospectives_Rating", "[Rating] >= 1 AND [Rating] <= 10");
                    table.CheckConstraint("CK_Retrospectives_UnpublishedReason", "[Status] <> 'Unpublished' OR (LEN(LTRIM(RTRIM([UnpublishedReason]))) BETWEEN 1 AND 500)");
                    table.ForeignKey(
                        name: "FK_Retrospectives_AspNetUsers_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Retrospectives_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Retrospectives_AuthorUserId_Status_UpdatedAtUtc",
                table: "Retrospectives",
                columns: new[] { "AuthorUserId", "Status", "UpdatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Retrospectives_GameId_Status",
                table: "Retrospectives",
                columns: new[] { "GameId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Retrospectives_Status_PublishedAtUtc",
                table: "Retrospectives",
                columns: new[] { "Status", "PublishedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Retrospectives");
        }
    }
}
