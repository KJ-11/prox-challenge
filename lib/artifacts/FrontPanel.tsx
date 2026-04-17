import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Stylized front-panel of the Vulcan OmniPro 220, based on page 8 of the
 * owner's manual. Uses semantic color tokens so it renders correctly in
 * both light and dark modes.
 *
 * Consumers (PolarityDiagram, ComponentHighlight) place overlays inside
 * `children`, which is rendered in the same coordinate space as the panel.
 * Socket anchor positions are exported as ANCHORS.
 */

export const PANEL_VIEWBOX = { width: 320, height: 400 } as const;

/** Anchor positions in SVG coordinate space for everything PolarityDiagram
 *  or ComponentHighlight would want to draw cables or arrows to. */
export const ANCHORS = {
  lcd: { x: 160, y: 100 },
  home_button: { x: 45, y: 100 },
  back_button: { x: 275, y: 100 },
  left_knob: { x: 80, y: 175 },
  main_knob: { x: 160, y: 175 },
  right_knob: { x: 240, y: 175 },
  vulcan_logo: { x: 160, y: 215 },
  power_switch: { x: 225, y: 260 },
  mig_gun_socket: { x: 75, y: 265 },
  spool_gun_gas_outlet: { x: 60, y: 345 },
  negative_socket: { x: 125, y: 345 },
  wire_feed_power_cable: { x: 175, y: 345 },
  positive_socket: { x: 240, y: 345 },
  storage_compartment: { x: 290, y: 320 },
} as const;

export type PanelAnchor = keyof typeof ANCHORS;

/* ---------- props ---------- */

export interface FrontPanelProps {
  /** Extra content rendered inside the SVG (overlays, cables, highlights). */
  children?: ReactNode;
  /** Highlight one or more sockets with a pulsing ring. */
  highlightAnchors?: PanelAnchor[];
  /** Display the labeled part callouts. Default true. */
  showLabels?: boolean;
  className?: string;
}

export function FrontPanel({
  children,
  highlightAnchors,
  showLabels = true,
  className,
}: FrontPanelProps): React.JSX.Element {
  return (
    <svg
      viewBox={`0 0 ${PANEL_VIEWBOX.width} ${PANEL_VIEWBOX.height}`}
      className={cn("w-full h-auto", className)}
      role="img"
      aria-label="Vulcan OmniPro 220 front panel"
    >
      {/* body */}
      <defs>
        <linearGradient id="panel-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-surface)" />
          <stop offset="100%" stopColor="var(--color-surface-muted)" />
        </linearGradient>
        <filter id="socket-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="1.5"
            floodOpacity="0.15"
          />
        </filter>
      </defs>

      {/* case outline */}
      <rect
        x="8"
        y="8"
        width="304"
        height="384"
        rx="18"
        fill="url(#panel-gradient)"
        stroke="var(--color-border-strong)"
        strokeWidth="1.5"
      />
      {/* handle bars top */}
      <rect
        x="32"
        y="14"
        width="50"
        height="8"
        rx="4"
        fill="var(--color-border)"
      />
      <rect
        x="238"
        y="14"
        width="50"
        height="8"
        rx="4"
        fill="var(--color-border)"
      />

      {/* LCD display */}
      <rect
        x="75"
        y="58"
        width="170"
        height="84"
        rx="6"
        fill="var(--color-background)"
        stroke="var(--color-border-strong)"
        strokeWidth="1.2"
      />
      <rect
        x="82"
        y="66"
        width="156"
        height="68"
        rx="3"
        fill="var(--color-surface-muted)"
      />
      {/* LCD content hint lines */}
      <rect
        x="90"
        y="74"
        width="30"
        height="4"
        rx="1"
        fill="var(--color-muted)"
        opacity="0.5"
      />
      <rect
        x="90"
        y="84"
        width="120"
        height="28"
        rx="2"
        fill="var(--color-brand)"
        opacity="0.12"
      />
      <rect
        x="90"
        y="120"
        width="60"
        height="4"
        rx="1"
        fill="var(--color-muted)"
        opacity="0.5"
      />

      {/* Home button (top left corner of LCD region) */}
      <rect
        x="33"
        y="88"
        width="26"
        height="22"
        rx="3"
        fill="var(--color-surface-muted)"
        stroke="var(--color-border-strong)"
        strokeWidth="1"
      />
      <text
        x="46"
        y="103"
        textAnchor="middle"
        fontSize="6"
        fill="var(--color-muted)"
        fontFamily="var(--font-mono)"
      >
        HOME
      </text>

      {/* Back button (top right corner of LCD region) */}
      <rect
        x="261"
        y="88"
        width="26"
        height="22"
        rx="3"
        fill="var(--color-surface-muted)"
        stroke="var(--color-border-strong)"
        strokeWidth="1"
      />
      <text
        x="274"
        y="103"
        textAnchor="middle"
        fontSize="6"
        fill="var(--color-muted)"
        fontFamily="var(--font-mono)"
      >
        BACK
      </text>

      {/* Three knobs */}
      {[ANCHORS.left_knob, ANCHORS.main_knob, ANCHORS.right_knob].map(
        (k, i) => (
          <g key={i}>
            <circle
              cx={k.x}
              cy={k.y}
              r="14"
              fill="var(--color-surface)"
              stroke="var(--color-border-strong)"
              strokeWidth="1.2"
            />
            <circle
              cx={k.x}
              cy={k.y}
              r="10"
              fill="var(--color-surface-muted)"
            />
            {/* indicator triangle pointing up */}
            <path
              d={`M ${k.x} ${k.y - 6} l 3 5 h -6 z`}
              fill="var(--color-foreground)"
            />
          </g>
        ),
      )}

      {/* Vulcan wordmark */}
      <text
        x={ANCHORS.vulcan_logo.x}
        y={ANCHORS.vulcan_logo.y}
        textAnchor="middle"
        fontSize="11"
        fontWeight="900"
        fontFamily="var(--font-sans)"
        fill="var(--color-brand)"
        letterSpacing="1.5"
      >
        VULCAN
      </text>

      {/* OmniPro 220 label */}
      <text
        x={ANCHORS.vulcan_logo.x}
        y={ANCHORS.vulcan_logo.y + 12}
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fontFamily="var(--font-mono)"
        fill="var(--color-muted)"
        letterSpacing="2"
      >
        OMNIPRO 220
      </text>

      {/* MIG gun / Spool gun socket (upper-left area) */}
      <g filter="url(#socket-shadow)">
        <circle
          cx={ANCHORS.mig_gun_socket.x}
          cy={ANCHORS.mig_gun_socket.y}
          r="16"
          fill="var(--color-surface)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.5"
        />
        <circle
          cx={ANCHORS.mig_gun_socket.x}
          cy={ANCHORS.mig_gun_socket.y}
          r="11"
          fill="var(--color-background)"
          stroke="var(--color-border-strong)"
          strokeWidth="0.8"
        />
        {/* keyed slot */}
        <rect
          x={ANCHORS.mig_gun_socket.x - 1.5}
          y={ANCHORS.mig_gun_socket.y - 11}
          width="3"
          height="4"
          fill="var(--color-foreground)"
          opacity="0.4"
        />
      </g>

      {/* Power switch */}
      <rect
        x={ANCHORS.power_switch.x - 14}
        y={ANCHORS.power_switch.y - 12}
        width="28"
        height="24"
        rx="3"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
        strokeWidth="1"
      />
      <rect
        x={ANCHORS.power_switch.x - 9}
        y={ANCHORS.power_switch.y - 7}
        width="18"
        height="14"
        rx="1"
        fill="var(--color-surface-muted)"
      />
      <line
        x1={ANCHORS.power_switch.x}
        y1={ANCHORS.power_switch.y - 5}
        x2={ANCHORS.power_switch.x}
        y2={ANCHORS.power_switch.y + 5}
        stroke="var(--color-foreground)"
        strokeWidth="1.5"
      />

      {/* Bottom panel (black strip where the output sockets live) */}
      <rect
        x="24"
        y="310"
        width="272"
        height="70"
        rx="5"
        fill="var(--color-foreground)"
        opacity="0.88"
      />

      {/* Spool gun gas outlet */}
      <g filter="url(#socket-shadow)">
        <circle
          cx={ANCHORS.spool_gun_gas_outlet.x}
          cy={ANCHORS.spool_gun_gas_outlet.y}
          r="11"
          fill="var(--color-surface-muted)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.2"
        />
        <circle
          cx={ANCHORS.spool_gun_gas_outlet.x}
          cy={ANCHORS.spool_gun_gas_outlet.y}
          r="5"
          fill="var(--color-background)"
        />
      </g>

      {/* Negative socket (−) */}
      <g filter="url(#socket-shadow)">
        <circle
          cx={ANCHORS.negative_socket.x}
          cy={ANCHORS.negative_socket.y}
          r="14"
          fill="var(--color-surface-muted)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.2"
        />
        <circle
          cx={ANCHORS.negative_socket.x}
          cy={ANCHORS.negative_socket.y}
          r="9"
          fill="var(--color-background)"
        />
      </g>
      <text
        x={ANCHORS.negative_socket.x}
        y={ANCHORS.negative_socket.y + 3}
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="var(--color-brand-soft)"
      >
        −
      </text>

      {/* Wire feed power cable (small) */}
      <g filter="url(#socket-shadow)">
        <circle
          cx={ANCHORS.wire_feed_power_cable.x}
          cy={ANCHORS.wire_feed_power_cable.y}
          r="7"
          fill="var(--color-surface-muted)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.2"
        />
        <circle
          cx={ANCHORS.wire_feed_power_cable.x}
          cy={ANCHORS.wire_feed_power_cable.y}
          r="3.5"
          fill="var(--color-background)"
        />
      </g>

      {/* Positive socket (+) */}
      <g filter="url(#socket-shadow)">
        <circle
          cx={ANCHORS.positive_socket.x}
          cy={ANCHORS.positive_socket.y}
          r="14"
          fill="var(--color-surface-muted)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.2"
        />
        <circle
          cx={ANCHORS.positive_socket.x}
          cy={ANCHORS.positive_socket.y}
          r="9"
          fill="var(--color-background)"
        />
      </g>
      <text
        x={ANCHORS.positive_socket.x}
        y={ANCHORS.positive_socket.y + 4}
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="var(--color-brand-soft)"
      >
        +
      </text>

      {/* Highlight rings */}
      {highlightAnchors?.map((anchor) => {
        const pos = ANCHORS[anchor];
        return (
          <g key={anchor}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="20"
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="2"
              opacity="0.9"
            >
              <animate
                attributeName="r"
                values="18;24;18"
                dur="1.6s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.9;0.3;0.9"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        );
      })}

      {/* Overlay content from consumer (cables etc.) */}
      {children}

      {/* Socket labels (below the black strip) */}
      {showLabels && (
        <g
          fontSize="6"
          fontFamily="var(--font-mono)"
          fill="var(--color-muted)"
          textAnchor="middle"
        >
          <text x={ANCHORS.spool_gun_gas_outlet.x} y="388">
            GAS OUT
          </text>
          <text x={ANCHORS.negative_socket.x} y="388">
            NEG (−)
          </text>
          <text x={ANCHORS.wire_feed_power_cable.x} y="388">
            WFS CABLE
          </text>
          <text x={ANCHORS.positive_socket.x} y="388">
            POS (+)
          </text>
        </g>
      )}
    </svg>
  );
}
