import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { AdminLoginScreen } from "@/features/admin/admin-login-screen";

afterEach(() => {
  cleanup();
});

describe("AdminLoginScreen", () => {
  it("shows an error when submitting empty fields", async () => {
    const onLogin = jest.fn();
    const view = await render(<AdminLoginScreen onLogin={onLogin} />);

    fireEvent.press(await view.findByTestId("admin-login-submit-button"));

    expect(await view.findByText("Email and password are required.")).toBeTruthy();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("submits the credentials successfully", async () => {
    const onLogin = jest.fn().mockResolvedValue(undefined);
    const view = await render(<AdminLoginScreen onLogin={onLogin} />);

    fireEvent.changeText(await view.findByTestId("admin-email-input"), "admin@example.com");
    fireEvent.changeText(await view.findByTestId("admin-password-input"), "secret-password");
    fireEvent.press(await view.findByTestId("admin-login-submit-button"));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("admin@example.com", "secret-password"));
  });

  it("toggles the password visibility", async () => {
    const view = await render(<AdminLoginScreen onLogin={jest.fn()} />);

    // Default is hidden
    expect(await view.findByTestId("admin-password-input")).toHaveProp("secureTextEntry", true);

    fireEvent.press(await view.findByTestId("admin-password-toggle"));
    
    // Now visible
    expect(await view.findByTestId("admin-password-input")).toHaveProp("secureTextEntry", false);

    fireEvent.press(await view.findByTestId("admin-password-toggle"));
    
    // Hidden again
    expect(await view.findByTestId("admin-password-input")).toHaveProp("secureTextEntry", true);
  });
});
