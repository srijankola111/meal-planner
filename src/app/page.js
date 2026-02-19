
"use client";

import AuthWrapper from "@/components/AuthWrapper";
import MainDashboard from "@/components/MainDashboard";

export default function Home() {
  return (
    <AuthWrapper>
      <MainDashboard />
    </AuthWrapper>
  );
}
