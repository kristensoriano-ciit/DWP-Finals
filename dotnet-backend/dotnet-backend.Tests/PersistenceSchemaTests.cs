using System.Data.Common;
using dotnet_backend.Data;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace dotnet_backend.Tests;

public sealed class PersistenceSchemaTests : IAsyncLifetime
{
    private readonly UserApiFactory _factory = new();

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task Migrations_create_erd_tables_and_required_retrospective_foreign_keys()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.OpenConnectionAsync();
        var connection = context.Database.GetDbConnection();

        Assert.Equal(1, await CountAsync(
            connection,
            "SELECT COUNT(*) FROM sys.tables WHERE [name] = 'Users'"));
        Assert.Equal(0, await CountAsync(
            connection,
            "SELECT COUNT(*) FROM sys.tables WHERE [name] = 'AspNetUsers'"));
        Assert.Equal(1, await CountAsync(
            connection,
            "SELECT COUNT(*) FROM sys.tables WHERE [name] = 'Games'"));
        Assert.Equal(1, await CountAsync(
            connection,
            "SELECT COUNT(*) FROM sys.tables WHERE [name] = 'Retrospectives'"));

        Assert.Equal(1, await CountAsync(connection, ForeignKeyCountSql("GameId", "Games")));
        Assert.Equal(1, await CountAsync(connection, ForeignKeyCountSql("AuthorUserId", "Users")));
        Assert.Equal(0, await CountAsync(connection, NullableColumnCountSql("GameId")));
        Assert.Equal(0, await CountAsync(connection, NullableColumnCountSql("AuthorUserId")));
        Assert.Equal(2, await CountAsync(connection, RestrictedForeignKeyCountSql()));
        Assert.Equal(1, await CountAsync(connection, RetrospectivePrimaryKeyCountSql()));
    }

    private static string ForeignKeyCountSql(string columnName, string principalTable) =>
        $$"""
        SELECT COUNT(*)
        FROM sys.foreign_key_columns AS fkc
        INNER JOIN sys.tables AS dependent ON dependent.object_id = fkc.parent_object_id
        INNER JOIN sys.columns AS dependentColumn
            ON dependentColumn.object_id = fkc.parent_object_id
            AND dependentColumn.column_id = fkc.parent_column_id
        INNER JOIN sys.tables AS principal ON principal.object_id = fkc.referenced_object_id
        WHERE dependent.[name] = 'Retrospectives'
          AND dependentColumn.[name] = '{{columnName}}'
          AND principal.[name] = '{{principalTable}}'
        """;

    private static string NullableColumnCountSql(string columnName) =>
        $$"""
        SELECT COUNT(*)
        FROM sys.columns AS columnInfo
        INNER JOIN sys.tables AS tableInfo ON tableInfo.object_id = columnInfo.object_id
        WHERE tableInfo.[name] = 'Retrospectives'
          AND columnInfo.[name] = '{{columnName}}'
          AND columnInfo.is_nullable = 1
        """;

    private static string RestrictedForeignKeyCountSql() =>
        """
        SELECT COUNT(*)
        FROM sys.foreign_keys AS foreignKeyInfo
        INNER JOIN sys.tables AS tableInfo ON tableInfo.object_id = foreignKeyInfo.parent_object_id
        WHERE tableInfo.[name] = 'Retrospectives'
          AND foreignKeyInfo.delete_referential_action_desc = 'NO_ACTION'
        """;

    private static string RetrospectivePrimaryKeyCountSql() =>
        """
        SELECT COUNT(*)
        FROM sys.key_constraints AS keyInfo
        INNER JOIN sys.tables AS tableInfo ON tableInfo.object_id = keyInfo.parent_object_id
        WHERE tableInfo.[name] = 'Retrospectives'
          AND keyInfo.[type] = 'PK'
        """;

    private static async Task<int> CountAsync(DbConnection connection, string sql)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }
}
