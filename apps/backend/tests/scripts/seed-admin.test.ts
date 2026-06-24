import { seedAdmin } from "../../scripts/seed-admin";

describe("seedAdmin script", () => {
  it("skips seeding if admin account already exists", async () => {
    const mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ id: "existing-id" }]),
      insert: jest.fn(),
    };

    const mockDatabaseClient = {
      db: mockDb,
    };

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    const exitCode = await seedAdmin(
      "admin@example.com",
      "secure-password",
      mockDatabaseClient,
    );

    expect(exitCode).toBe(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Admin account with email admin@example.com already exists. Skipping seed.",
    );

    consoleSpy.mockRestore();
  });

  it("inserts new admin if none exists", async () => {
    const mockInsert = { values: jest.fn().mockResolvedValue(undefined) };
    const mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnValue(mockInsert),
    };

    const mockDatabaseClient = {
      db: mockDb,
    };

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    const exitCode = await seedAdmin(
      "newadmin@example.com",
      "secure-password",
      mockDatabaseClient,
    );

    expect(exitCode).toBe(0);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "newadmin@example.com",
        passwordHash: expect.any(String),
      })
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Successfully created admin account for newadmin@example.com.",
    );

    consoleSpy.mockRestore();
  });
});
