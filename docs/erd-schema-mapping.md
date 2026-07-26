# ERD to Physical Schema Mapping

The diagram in [`erd.png`](erd.png) is a conceptual ERD. The SQL Server schema keeps the same three
core entities and both one-to-many relationships, while using C# and ASP.NET Identity naming.

| ERD concept | Physical implementation |
|-------------|-------------------------|
| Users | `Users` (ASP.NET Identity user table) |
| Games | `Games` |
| Retrospectives | `Retrospectives` |
| `Retrospectives.game_id` | Required `Retrospectives.GameId` foreign key to `Games.Id` |
| `Retrospectives.user_id` | Required `Retrospectives.AuthorUserId` foreign key to `Users.Id` |
| User type (`Admin` or `Author`) | `AspNetRoles` and `AspNetUserRoles`, using ASP.NET Identity's role model |

One User and one Game can each be referenced by many Retrospectives. Both foreign keys use restricted
deletion, so archived Games and deactivated Users retain retrospective attribution. Identity support
tables and lifecycle/audit columns extend the conceptual diagram; they do not change its core
cardinality.

Migration-backed assertions for the table names, required foreign keys, restricted deletion, and
Retrospective primary key are in
`dotnet-backend/dotnet-backend.Tests/PersistenceSchemaTests.cs`.
