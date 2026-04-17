import { lookupWeldEntry, lookupFigure } from "./data";

/**
 * For each artifact type, the pages of the owner's manual it grounds itself
 * in. Some artifacts' sources depend on params (weld_comparison looks up its
 * catalog_id; component_highlight uses the figure's page; etc.).
 *
 * Returned as { name, pages } so the sources sidebar can display both a
 * rendered-artifact label and a flat list of pages.
 */

export interface ArtifactSource {
  name: string;
  pages: number[];
}

export function sourcesForArtifact(
  artifactType: string,
  params: unknown,
): ArtifactSource[] {
  const p = (params ?? {}) as Record<string, unknown>;
  switch (artifactType) {
    case "duty_cycle_matrix":
      return [
        { name: "Specifications · duty cycle", pages: [7, 19, 29] },
      ];
    case "polarity_diagram": {
      const process = typeof p.process === "string" ? p.process : "";
      const page = polarityPage(process);
      const pages = [page];
      if (typeof p.compare_with === "string") {
        pages.push(polarityPage(p.compare_with));
      }
      return [{ name: "Polarity setup", pages }];
    }
    case "settings_configurator":
      return [
        { name: "LCD settings flow", pages: [20] },
        { name: "Selection chart", pages: [1] },
      ];
    case "troubleshooting_tree":
      return [{ name: "Troubleshooting table", pages: [42, 43, 44] }];
    case "weld_comparison": {
      const pages: number[] = [];
      if (typeof p.catalog_id === "string") {
        const e = lookupWeldEntry(p.catalog_id);
        if (e) pages.push(e.source_page);
      }
      if (typeof p.runner_up_id === "string") {
        const e = lookupWeldEntry(p.runner_up_id);
        if (e) pages.push(e.source_page);
      }
      return [{ name: "Weld diagnosis reference", pages: pages.length ? pages : [35, 38] }];
    }
    case "procedural_walkthrough": {
      const topic = typeof p.topic === "string" ? p.topic : "";
      return [{ name: "Procedure", pages: PROCEDURE_PAGES[topic] ?? [] }];
    }
    case "component_highlight": {
      if (typeof p.figure_id === "string") {
        const f = lookupFigure(p.figure_id);
        if (f) return [{ name: f.caption, pages: [f.page] }];
      }
      return [];
    }
    case "selection_chart_interactive":
      return [{ name: "Selection chart", pages: [1] }];
    default:
      return [];
  }
}

function polarityPage(process: string): number {
  switch (process) {
    case "mig":
      return 14;
    case "flux_cored":
      return 13;
    case "tig":
      return 24;
    case "stick":
      return 27;
    default:
      return 14;
  }
}

const PROCEDURE_PAGES: Record<string, number[]> = {
  cable_mig: [13, 14],
  cable_flux: [12, 13],
  cable_tig: [24, 25],
  cable_stick: [27],
  spool_load_2lb: [10],
  spool_load_10lb: [11],
  tungsten_sharpen: [26],
  nozzle_clean: [41],
  feed_tension_set: [15, 16, 17],
};
