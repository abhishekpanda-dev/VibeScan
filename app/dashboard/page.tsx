import { redirect } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { getDashboardData } from "@/lib/scan-data";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    payment?: string | string[] | undefined;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const dashboardData = await getDashboardData();

  if (!dashboardData) {
    redirect("/auth");
  }

  const resolvedSearchParams = await searchParams;
  const paymentParam = Array.isArray(resolvedSearchParams.payment)
    ? resolvedSearchParams.payment[0]
    : resolvedSearchParams.payment;

  return (
    <DashboardShell
      paymentSuccess={paymentParam === "success"}
      profile={dashboardData.profile}
      scans={dashboardData.scans}
      signOutAction={signOut}
      totalScansUsed={dashboardData.totalScansUsed}
      user={dashboardData.user}
    />
  );
}
