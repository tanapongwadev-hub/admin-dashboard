import { redirect } from "next/navigation";

// CPS is an internal system: accounts are created by an administrator in
// cps-api, there is no public sign-up. The old template page faked a
// successful sign-up with a timer, so this route now just goes to login.
export default function RegisterPage() {
  redirect("/login");
}
