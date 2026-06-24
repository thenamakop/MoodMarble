import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import {
  clearAdminSession,
  loadAdminSession,
  saveAdminSession,
} from "./session";

jest.mock("expo-secure-store");

describe("Admin Session", () => {
  const originalPlatformOs = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatformOs;
    jest.clearAllMocks();
  });

  describe("Native Platform", () => {
    beforeEach(() => {
      Platform.OS = "ios";
    });

    it("saves and loads a valid admin session", async () => {
      const mockSession = {
        adminJwt: "test.jwt.token",
        workspaceId: "ws_123",
        workspaceName: "Test Workspace",
      };

      jest
        .spyOn(SecureStore, "getItemAsync")
        .mockResolvedValueOnce(JSON.stringify(mockSession));

      const session = await loadAdminSession();
      expect(session).toEqual(mockSession);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        "moodmarble.admin-session",
      );
    });

    it("clears an invalid session automatically during load", async () => {
      jest.spyOn(SecureStore, "getItemAsync").mockResolvedValueOnce(
        JSON.stringify({ adminJwt: "" }), // Invalid, missing workspaceId
      );
      jest.spyOn(SecureStore, "deleteItemAsync").mockResolvedValueOnce();

      const session = await loadAdminSession();
      expect(session).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "moodmarble.admin-session",
      );
    });

    it("saves an admin session", async () => {
      const mockSession = {
        adminJwt: "test.jwt.token",
        workspaceId: "ws_123",
        workspaceName: "Test Workspace",
      };

      jest.spyOn(SecureStore, "setItemAsync").mockResolvedValueOnce();

      await saveAdminSession(mockSession);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "moodmarble.admin-session",
        JSON.stringify(mockSession),
      );
    });

    it("clears an admin session", async () => {
      jest.spyOn(SecureStore, "deleteItemAsync").mockResolvedValueOnce();

      await clearAdminSession();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "moodmarble.admin-session",
      );
    });
  });

  describe("Web Platform", () => {
    let mockStorage: Record<string, string>;

    beforeEach(() => {
      Platform.OS = "web";
      mockStorage = {};

      const localStorageMock = {
        getItem: jest.fn((key: string) => mockStorage[key] ?? null),
        setItem: jest.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockStorage[key];
        }),
        length: 0,
        key: jest.fn(),
        clear: jest.fn(),
      };

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
        writable: true,
      });
    });

    it("saves and loads a valid admin session using web storage", async () => {
      const mockSession = {
        adminJwt: "test.jwt.token",
        workspaceId: "ws_123",
        workspaceName: "Test Workspace",
      };

      await saveAdminSession(mockSession);
      const session = await loadAdminSession();
      expect(session).toEqual(mockSession);
      expect(mockStorage["moodmarble.admin-session"]).toEqual(
        JSON.stringify(mockSession),
      );
    });

    it("clears an admin session using web storage", async () => {
      const mockSession = {
        adminJwt: "test.jwt.token",
        workspaceId: "ws_123",
        workspaceName: "Test Workspace",
      };

      await saveAdminSession(mockSession);
      await clearAdminSession();
      const session = await loadAdminSession();
      expect(session).toBeNull();
      expect(mockStorage["moodmarble.admin-session"]).toBeUndefined();
    });
  });
});
