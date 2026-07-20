using System.Net;
using System.Text.Json;
using dotnet_backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace dotnet_backend.Tests;

public sealed class OpenApiContractTests(UserApiFactory factory)
    : IClassFixture<UserApiFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GeneratedSwaggerContainsEveryPlannedUsersOperation()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var response = await client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var document = await JsonDocument.ParseAsync(stream);
        var paths = document.RootElement.GetProperty("paths");

        Assert.True(paths.TryGetProperty("/api/auth/register", out var register));
        Assert.True(register.TryGetProperty("post", out var registerPost));
        Assert.True(
            !registerPost.TryGetProperty("security", out var registerSecurity) ||
            registerSecurity.GetArrayLength() == 0);
        Assert.True(paths.TryGetProperty("/api/auth/login", out var login));
        Assert.True(login.TryGetProperty("post", out var loginPost));
        Assert.True(
            !loginPost.TryGetProperty("security", out var loginSecurity) ||
            loginSecurity.GetArrayLength() == 0);
        var loginResponses = loginPost.GetProperty("responses");
        foreach (var status in new[] { "200", "400", "401", "429" })
        {
            Assert.True(loginResponses.TryGetProperty(status, out _), $"Missing login response {status}.");
        }
        Assert.True(paths.TryGetProperty("/api/account/me", out var profile));
        Assert.True(profile.TryGetProperty("get", out var profileGet));
        Assert.True(profileGet.GetProperty("security").GetArrayLength() > 0);
        Assert.True(profile.TryGetProperty("put", out _));
        Assert.True(paths.TryGetProperty("/api/account/password", out var password));
        Assert.True(password.TryGetProperty("put", out _));
        Assert.True(paths.TryGetProperty("/api/admin/users", out var users));
        Assert.True(users.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/admin/users/{userId}", out var user));
        Assert.True(user.TryGetProperty("delete", out _));
        Assert.True(paths.TryGetProperty("/api/games", out var games));
        Assert.True(games.TryGetProperty("get", out var getGames));
        AssertAnonymous(getGames);
        var releaseWindowParameter = getGames.GetProperty("parameters")
            .EnumerateArray()
            .Single(parameter => parameter.GetProperty("name").GetString() == "releaseWindow");
        var releaseWindowSchema = releaseWindowParameter.GetProperty("schema");
        if (releaseWindowSchema.TryGetProperty("$ref", out var schemaReference))
        {
            var schemaName = schemaReference.GetString()!.Split('/').Last();
            releaseWindowSchema = document.RootElement
                .GetProperty("components")
                .GetProperty("schemas")
                .GetProperty(schemaName);
        }
        Assert.Equal("string", releaseWindowSchema.GetProperty("type").GetString());
        Assert.Equal(
            ["all", "new", "upcoming"],
            releaseWindowSchema.GetProperty("enum")
                .EnumerateArray()
                .Select(value => value.GetString()));
        Assert.Contains("200", getGames.GetProperty("responses").EnumerateObject().Select(item => item.Name));
        Assert.Contains("400", getGames.GetProperty("responses").EnumerateObject().Select(item => item.Name));
        Assert.DoesNotContain("401", getGames.GetProperty("responses").EnumerateObject().Select(item => item.Name));
        Assert.True(games.TryGetProperty("post", out var createGame));
        Assert.True(createGame.GetProperty("security").GetArrayLength() > 0);
        foreach (var status in new[] { "201", "400", "401", "403", "409" })
        {
            Assert.True(createGame.GetProperty("responses").TryGetProperty(status, out _));
        }
        Assert.True(paths.TryGetProperty("/api/games/{gameId}", out var game));
        Assert.True(game.TryGetProperty("get", out var getGame));
        Assert.True(game.TryGetProperty("put", out var updateGame));
        Assert.True(game.TryGetProperty("delete", out var archiveGame));
        AssertAnonymous(getGame);
        Assert.DoesNotContain("401", getGame.GetProperty("responses").EnumerateObject().Select(item => item.Name));
        foreach (var mutation in new[] { createGame, updateGame, archiveGame })
        {
            Assert.True(mutation.GetProperty("security").GetArrayLength() > 0);
        }
        Assert.True(paths.TryGetProperty("/api/retrospectives", out var retrospectives));
        Assert.True(retrospectives.TryGetProperty("get", out var publishedList));
        Assert.True(retrospectives.TryGetProperty("post", out var createRetrospective));
        Assert.True(paths.TryGetProperty(
            "/api/retrospectives/{retrospectiveId}", out var retrospective));
        Assert.True(retrospective.TryGetProperty("get", out var publishedDetail));
        Assert.True(retrospective.TryGetProperty("put", out var updateRetrospective));
        Assert.True(retrospective.TryGetProperty("delete", out var archiveRetrospective));
        Assert.True(paths.TryGetProperty(
            "/api/retrospectives/{retrospectiveId}/status", out var retrospectiveStatus));
        Assert.True(retrospectiveStatus.TryGetProperty("put", out var changeStatus));
        Assert.True(paths.TryGetProperty(
            "/api/account/retrospectives", out var ownRetrospectives));
        Assert.True(ownRetrospectives.TryGetProperty("get", out var ownList));
        Assert.True(paths.TryGetProperty(
            "/api/account/retrospectives/{retrospectiveId}", out var ownRetrospective));
        Assert.True(ownRetrospective.TryGetProperty("get", out var ownDetail));

        foreach (var publicOperation in new[] { publishedList, publishedDetail })
        {
            Assert.True(
                !publicOperation.TryGetProperty("security", out var security) ||
                security.GetArrayLength() == 0);
        }
        foreach (var operation in new[]
                 {
                     createRetrospective, updateRetrospective, archiveRetrospective,
                     changeStatus, ownList, ownDetail
                 })
        {
            Assert.True(operation.GetProperty("security").GetArrayLength() > 0);
        }
        AssertResponses(publishedList, "200", "400");
        AssertResponses(createRetrospective, "201", "400", "401", "403");
        AssertResponses(publishedDetail, "200", "404");
        AssertResponses(updateRetrospective, "200", "400", "401", "403", "404", "409");
        AssertResponses(changeStatus, "200", "400", "401", "403", "404", "409");
        AssertResponses(archiveRetrospective, "204", "400", "401", "403", "404", "409");
        AssertResponses(ownList, "200", "400", "401", "403");
        AssertResponses(ownDetail, "200", "401", "403", "404");
        Assert.Contains(archiveRetrospective.GetProperty("parameters").EnumerateArray(),
            parameter => parameter.GetProperty("name").GetString() == "If-Match" &&
                parameter.GetProperty("in").GetString() == "header");

        var schemas = document.RootElement.GetProperty("components").GetProperty("schemas");
        var authorStatus = schemas.GetProperty("AuthorRetrospectiveStatus");
        Assert.Equal(
            ["draft", "review", "published", "unpublished"],
            authorStatus.GetProperty("enum").EnumerateArray().Select(value => value.GetString()));
        Assert.DoesNotContain(
            "archived",
            authorStatus.GetProperty("enum").EnumerateArray().Select(value => value.GetString()));

        var createSchema = schemas.GetProperty("CreateRetrospectiveRequest");
        AssertContentConstraints(document, createSchema);
        AssertStatusUsesAuthorContract(document, createSchema.GetProperty("properties").GetProperty("status"));
        var createRating = createSchema.GetProperty("properties").GetProperty("rating");
        Assert.Equal(1, createRating.GetProperty("minimum").GetInt32());
        Assert.Equal(10, createRating.GetProperty("maximum").GetInt32());

        var updateSchema = schemas.GetProperty("UpdateRetrospectiveRequest");
        AssertContentConstraints(document, updateSchema);
        var changeStatusSchema = schemas.GetProperty("ChangeRetrospectiveStatusRequest");
        Assert.Contains("status", changeStatusSchema.GetProperty("required")
            .EnumerateArray().Select(value => value.GetString()));
        Assert.Contains("rowVersion", changeStatusSchema.GetProperty("required")
            .EnumerateArray().Select(value => value.GetString()));
        AssertStatusUsesAuthorContract(
            document,
            changeStatusSchema.GetProperty("properties").GetProperty("status"));
        var reason = changeStatusSchema.GetProperty("properties").GetProperty("unpublishedReason");
        Assert.Equal(1, reason.GetProperty("minLength").GetInt32());
        Assert.Equal(500, reason.GetProperty("maxLength").GetInt32());

        var ownStatusParameter = ownList.GetProperty("parameters")
            .EnumerateArray()
            .Single(parameter => parameter.GetProperty("name").GetString() == "status");
        AssertStatusUsesAuthorContract(document, ownStatusParameter.GetProperty("schema"));

        var publicResponse = schemas.GetProperty("PublishedRetrospectiveResponse")
            .GetProperty("properties");
        Assert.False(publicResponse.TryGetProperty("rowVersion", out _));
        Assert.False(publicResponse.TryGetProperty("unpublishedReason", out _));
        Assert.False(publicResponse.TryGetProperty("status", out _));
        Assert.Equal(13, paths.EnumerateObject().Count());
    }

    private static void AssertResponses(JsonElement operation, params string[] statuses)
    {
        var responses = operation.GetProperty("responses");
        foreach (var status in statuses)
        {
            Assert.True(responses.TryGetProperty(status, out _), $"Missing response {status}.");
        }
    }

    private static void AssertAnonymous(JsonElement operation)
    {
        Assert.True(
            !operation.TryGetProperty("security", out var security) || security.GetArrayLength() == 0,
            "Expected the operation to allow anonymous requests.");
    }

    private static void AssertContentConstraints(JsonDocument document, JsonElement schema)
    {
        var properties = schema.GetProperty("properties");
        var title = properties.GetProperty("title");
        Assert.Equal(1, title.GetProperty("minLength").GetInt32());
        Assert.Equal(200, title.GetProperty("maxLength").GetInt32());
        var reviewContent = properties.GetProperty("reviewContent");
        Assert.Equal(1, reviewContent.GetProperty("minLength").GetInt32());
        Assert.Equal(20000, reviewContent.GetProperty("maxLength").GetInt32());
        var imageUrl = properties.GetProperty("imageUrl");
        Assert.Equal(2048, imageUrl.GetProperty("maxLength").GetInt32());
        Assert.Equal("^[Hh][Tt][Tt][Pp][Ss]?://", imageUrl.GetProperty("pattern").GetString());
        Assert.Contains("HTTP or HTTPS", imageUrl.GetProperty("description").GetString());
    }

    private static void AssertStatusUsesAuthorContract(
        JsonDocument document,
        JsonElement schema)
    {
        var resolved = ResolveSchema(document, schema);
        Assert.Equal(
            ["draft", "review", "published", "unpublished"],
            resolved.GetProperty("enum").EnumerateArray().Select(value => value.GetString()));
    }

    private static JsonElement ResolveSchema(JsonDocument document, JsonElement schema)
    {
        if (!schema.TryGetProperty("$ref", out var reference))
        {
            return schema;
        }

        var schemaName = reference.GetString()!.Split('/').Last();
        return document.RootElement.GetProperty("components").GetProperty("schemas")
            .GetProperty(schemaName);
    }
}
