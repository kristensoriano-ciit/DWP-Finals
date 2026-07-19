using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace dotnet_backend.OpenApi;

public sealed class AuthorizeOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var methodAttributes = context.MethodInfo.GetCustomAttributes(true);
        var controllerAttributes = context.MethodInfo.DeclaringType?.GetCustomAttributes(true) ?? [];
        var allowsAnonymous = methodAttributes.OfType<AllowAnonymousAttribute>().Any() ||
                              controllerAttributes.OfType<AllowAnonymousAttribute>().Any();
        var requiresAuthorization = methodAttributes.OfType<AuthorizeAttribute>().Any() ||
                                    controllerAttributes.OfType<AuthorizeAttribute>().Any();

        operation.Security = allowsAnonymous || !requiresAuthorization
            ? []
            :
            [
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    }] = Array.Empty<string>()
                }
            ];
    }
}
