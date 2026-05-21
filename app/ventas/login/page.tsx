import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { token?: string; from?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <LoginForm token={searchParams?.token} from={searchParams?.from} />
    </div>
  );
}
