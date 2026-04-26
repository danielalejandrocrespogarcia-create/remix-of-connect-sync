import logo from "@/assets/upt-logo.png";
import { cn } from "@/lib/utils";

interface UPTLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const UPTLogo = ({ size = 80, className, glow = true }: UPTLogoProps) => {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl bg-white p-2",
        glow && "animate-pulse-neon",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logo}
        alt="Universidad Politécnica Territorial Federico Brito Figueroa - Aragua"
        className="h-full w-full object-contain"
        loading="eager"
      />
    </div>
  );
};
