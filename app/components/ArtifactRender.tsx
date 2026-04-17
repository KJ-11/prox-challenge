"use client";

import { renderArtifact } from "@/lib/artifacts/registry";

export interface ArtifactRenderProps {
  artifactType: string;
  params: unknown;
}

export function ArtifactRender({
  artifactType,
  params,
}: ArtifactRenderProps): React.JSX.Element {
  return <div className="my-3">{renderArtifact(artifactType, params)}</div>;
}
