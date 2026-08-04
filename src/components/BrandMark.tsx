import Image from "next/image";

export function BrandMark({ priority = false }: { priority?: boolean }) {
  return (
    <span className="brand-mark" aria-hidden="true">
      <Image
        className="brand-mark-image"
        src="/fraudguard-logo.png"
        alt=""
        width={48}
        height={48}
        priority={priority}
      />
    </span>
  );
}
