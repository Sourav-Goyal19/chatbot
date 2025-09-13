import Link from "next/link";
import { PressableButton } from "@/components/pressable-button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950/70 flex items-center justify-center">
      <Link href="/chat">
        <PressableButton text="Get Started" />
      </Link>
    </div>
  );
}
