import { getCurrentUser } from "@/actions/auth";
import { AccountView } from "@/components/account-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi Cuenta | MTG Utils",
  description: "Información de cuenta y sesión de usuario en MTG Utils",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  return <AccountView user={user} />;
}
