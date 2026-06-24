import { useRouter } from "expo-router";

import { AdminLoginScreen } from "@/features/admin/admin-login-screen";
import { loginAdmin } from "@/features/admin/api";
import { saveAdminSession } from "@/features/admin/session";
import { buildAdminRouteParams } from "@/features/admin/route-state";

export default function AdminLoginRoute() {
  const router = useRouter();

  async function handleLogin(email: string, password: string) {
    const response = await loginAdmin({ email, password });

    const session = {
      adminJwt: response.admin_jwt,
      workspaceId: response.workspace.id,
      workspaceName: response.workspace.name,
    };

    await saveAdminSession(session);

    // Route into the existing admin panel flow with the admin JWT and workspace context
    router.replace({
      pathname: "/admin",
      params: buildAdminRouteParams(session),
    });
  }

  function handleReturnHome() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  return (
    <AdminLoginScreen onLogin={handleLogin} onReturnHome={handleReturnHome} />
  );
}
