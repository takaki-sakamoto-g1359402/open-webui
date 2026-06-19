import { RequireRole } from "@/components/railia/common";
import { WalletPage } from "@/components/railia/wallet-page";

export default function WorkerWalletRoute() {
  return (
    <RequireRole role="worker">
      <WalletPage />
    </RequireRole>
  );
}
