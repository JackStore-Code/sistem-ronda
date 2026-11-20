import { Shell } from "@/components/layout/Shell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <Shell peran="ketua">{children}</Shell>;
}
