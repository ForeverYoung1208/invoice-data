import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'InvoiceApp Dashboard',
  description: 'Invoice data extraction dashboard',
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
