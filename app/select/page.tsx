import { SelectClient } from "@/components/routes/SelectClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SelectPage() {
  return <SelectClient />;
}
