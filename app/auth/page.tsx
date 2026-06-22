import { AuthForm } from "@/app/auth/auth-form";
import { getSafeRedirectPath, getSingleSearchParam } from "@/lib/auth/redirects";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
    next?: string | string[];
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;

  return (
    <AuthForm
      initialError={getSingleSearchParam(params.error)}
      initialMessage={getSingleSearchParam(params.message)}
      nextPath={getSafeRedirectPath(getSingleSearchParam(params.next))}
    />
  );
}
