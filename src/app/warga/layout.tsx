import { Shell } from "@/components/layout/Shell";

export default function WargaLayout({ children }: LayoutProps<"/warga">) {
  return <Shell peran="warga">{children}</Shell>;
}
