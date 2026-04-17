"use client";

import Image from "next/image";
import type { UserMessage } from "@/lib/chat/types";

export function UserBubble({
  message,
}: {
  message: UserMessage;
}): React.JSX.Element {
  const text = message.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] space-y-2">
        {message.imagePreviewUrls.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {message.imagePreviewUrls.map((url, i) => (
              // biome-ignore lint/performance/noImgElement: data URL from user upload
              <Image
                key={i}
                src={url}
                alt={`Attached image ${i + 1}`}
                width={160}
                height={160}
                unoptimized
                className="h-32 w-32 rounded-lg border border-[color:var(--color-border)] object-cover"
              />
            ))}
          </div>
        )}
        {text && (
          <div className="rounded-2xl rounded-br-md bg-[color:var(--color-brand-soft)] px-4 py-2.5 text-sm text-[color:var(--color-foreground)]">
            {text}
          </div>
        )}
      </div>
    </div>
  );
}
