import AuthLayout from "@/components/auth/AuthLayout";
import SignUpForm from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthLayout rightWidthClass="w-1/3">
      <SignUpForm />
    </AuthLayout>
  );
}
