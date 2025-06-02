import AuthLayout from "@/components/auth/AuthLayout";
import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <AuthLayout rightWidthClass="w-1/4">
      <SignInForm />
    </AuthLayout>
  );
}
