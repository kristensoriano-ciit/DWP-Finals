using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using dotnet_backend.Models;
using Microsoft.IdentityModel.Tokens;

namespace dotnet_backend.Services;

public sealed record JwtTokenResult(string AccessToken, DateTimeOffset ExpiresAtUtc);

public sealed class JwtTokenService(IConfiguration configuration, TimeProvider timeProvider)
{
    public JwtTokenResult CreateToken(ApplicationUser user, IReadOnlyCollection<string> roles)
    {
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key must be configured.");
        var issuer = configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("Jwt:Issuer must be configured.");
        var audience = configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("Jwt:Audience must be configured.");
        var lifetimeMinutes = configuration.GetValue<int?>("Jwt:AccessTokenMinutes") ?? 60;
        var now = timeProvider.GetUtcNow();
        var expiresAt = now.AddMinutes(lifetimeMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("auth_version", user.AuthenticationVersion.ToString())
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            now.UtcDateTime,
            expiresAt.UtcDateTime,
            signingCredentials);

        return new JwtTokenResult(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt);
    }
}
