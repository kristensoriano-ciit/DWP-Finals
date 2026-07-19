using dotnet_backend.Contracts.Retrospectives;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace dotnet_backend.OpenApi;

public sealed class RetrospectiveSchemaFilter : ISchemaFilter
{
    private const string HttpImagePattern = "^[Hh][Tt][Tt][Pp][Ss]?://";

    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type == typeof(CreateRetrospectiveRequest))
        {
            ApplyContentConstraints(schema);
            ApplyStatusReasonConstraint(schema);
        }
        else if (context.Type == typeof(UpdateRetrospectiveRequest))
        {
            ApplyContentConstraints(schema);
        }
        else if (context.Type == typeof(ChangeRetrospectiveStatusRequest))
        {
            ApplyStatusReasonConstraint(schema);
        }
    }

    private static void ApplyContentConstraints(OpenApiSchema schema)
    {
        SetTrimmedLength(schema, "title", 1, 200);
        SetTrimmedLength(schema, "reviewContent", 1, 20000);
        if (schema.Properties.TryGetValue("imageUrl", out var imageUrl))
        {
            imageUrl.MaxLength = 2048;
            imageUrl.Pattern = HttpImagePattern;
            imageUrl.Description =
                "Optional absolute HTTP or HTTPS URL. Whitespace is trimmed before validation.";
        }
    }

    private static void ApplyStatusReasonConstraint(OpenApiSchema schema)
    {
        SetTrimmedLength(schema, "unpublishedReason", 1, 500);
        if (schema.Properties.TryGetValue("unpublishedReason", out var reason))
        {
            reason.Description = "Required when status is unpublished; trimmed before validation.";
        }
    }

    private static void SetTrimmedLength(
        OpenApiSchema schema,
        string propertyName,
        int minimum,
        int maximum)
    {
        if (schema.Properties.TryGetValue(propertyName, out var property))
        {
            property.MinLength = minimum;
            property.MaxLength = maximum;
        }
    }
}
