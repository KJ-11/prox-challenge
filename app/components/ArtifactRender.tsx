"use client";

import { renderArtifact } from "@/lib/artifacts/registry";

export interface ArtifactRenderProps {
  artifactType: string;
  params: unknown;
  /**
   * Most recent client-side user image URL (from object URL). Automatically
   * merged into weld_comparison params as user_image_url so the artifact can
   * display the user's photo alongside the catalog reference.
   */
  userImageUrl?: string;
}

export function ArtifactRender({
  artifactType,
  params,
  userImageUrl,
}: ArtifactRenderProps): React.JSX.Element {
  const augmented = maybeAugment(artifactType, params, userImageUrl);
  return <div className="my-3">{renderArtifact(artifactType, augmented)}</div>;
}

function maybeAugment(
  artifactType: string,
  params: unknown,
  userImageUrl: string | undefined,
): unknown {
  if (artifactType !== "weld_comparison" || !userImageUrl) return params;
  if (!params || typeof params !== "object") {
    return { user_image_url: userImageUrl };
  }
  const existing = params as Record<string, unknown>;
  if (typeof existing.user_image_url === "string" && existing.user_image_url.length > 0) {
    return params;
  }
  return { ...existing, user_image_url: userImageUrl };
}
