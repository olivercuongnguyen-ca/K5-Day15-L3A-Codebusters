import { cn } from "@/lib/cn";

export interface VinUniCampusMapSvgProps {
  activeBuilding?: string;
  roomCode?: string;
  className?: string;
}

interface BuildingMeta {
  id: string;
  label: string;
  anchorX: number;
  anchorTopY: number;
}

const BUILDING_META: Record<string, BuildingMeta> = {
  A: { id: "A", label: "Tòa A (LAB)", anchorX: 695, anchorTopY: 820 },
  B: { id: "B", label: "Tòa B (Auditorium)", anchorX: 861, anchorTopY: 678 },
  C: { id: "C", label: "Tòa C", anchorX: 540, anchorTopY: 937 },
  D: { id: "D", label: "Tòa D", anchorX: 394, anchorTopY: 1078 },
  E: { id: "E", label: "Tòa E (Canteen)", anchorX: 854, anchorTopY: 942 },
  F: { id: "F", label: "Tòa F (Medical Simulation)", anchorX: 979, anchorTopY: 1052 },
  G: { id: "G", label: "Tòa G", anchorX: 695, anchorTopY: 696 },
  H: { id: "H", label: "Tòa H", anchorX: 544, anchorTopY: 678 },
  I: { id: "I", label: "Tòa I", anchorX: 695, anchorTopY: 920 },
  J: { id: "J", label: "Tòa J (Dorm)", anchorX: 1414, anchorTopY: 373 },
  K: { id: "K", label: "Tòa K", anchorX: 1151, anchorTopY: 373 },
  L: { id: "L", label: "Tòa L", anchorX: 988, anchorTopY: 373 },
  P: { id: "P", label: "Tòa P (Canteen)", anchorX: 1420, anchorTopY: 628 },
};

export function VinUniCampusMapSvg({
  activeBuilding,
  roomCode,
  className,
}: VinUniCampusMapSvgProps) {
  const normalizedActive = activeBuilding?.trim().toUpperCase();
  const activeMeta = normalizedActive
    ? BUILDING_META[normalizedActive]
    : undefined;

  function buildingClass(id: string): string {
    if (!normalizedActive) return "cm-b";
    return normalizedActive === id ? "cm-b on" : "cm-b cm-dim";
  }

  const ariaLabel = activeMeta
    ? `Bản đồ 2D khuôn viên VinUni, đang làm nổi bật ${activeMeta.label}${roomCode ? ` — Phòng ${roomCode}` : ""}`
    : "Bản đồ 2D khuôn viên VinUni";

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      <div className="w-full rounded-[14px] overflow-hidden border border-border bg-[#FBF2E4]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="60 30 1580 1920"
          className="cmap w-full h-auto block select-none"
          role="img"
          aria-label={ariaLabel}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter
              id="vinuni-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="16" result="blur" />
              <feFlood
                floodColor="#F59E0B"
                floodOpacity="0.92"
                result="glowColor"
              />
              <feComposite
                in="glowColor"
                in2="blur"
                operator="in"
                result="softGlow"
              />
              <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient
              id="vinuni-lit-fill"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#FFE566" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <style>{`
              .cmap .cm-bg { fill: #fbf2e4; }
              .cmap .cm-road line {
                stroke: #344374;
                stroke-width: 2.2;
                stroke-linecap: round;
              }
              .cmap .cm-roadlabel text {
                fill: #273566;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 1.4px;
                text-anchor: middle;
                font-family: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
              }
              .cmap .cm-line {
                fill: none;
                stroke: #344374;
                stroke-width: 2.1;
                stroke-linejoin: round;
                stroke-linecap: round;
              }
              .cmap .cm-park rect {
                fill: #233875;
                stroke: #192857;
                stroke-width: 2;
              }
              .cmap .cm-park text {
                fill: #ffffff;
                font-size: 22px;
                font-weight: 700;
                text-anchor: middle;
                font-family: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
              }
              .cmap .cm-b rect,
              .cmap .cm-b path {
                fill: #d8ab58;
                stroke: #b58534;
                stroke-width: 2;
                transition: opacity 200ms ease, fill 200ms ease, stroke 200ms ease;
              }
              .cmap .cm-b .inner {
                fill: #fbf2e4;
                stroke: #b58534;
                stroke-width: 1.8;
              }
              .cmap .cm-b text {
                fill: #1d2436;
                font-size: 21px;
                font-weight: 700;
                text-anchor: middle;
                font-family: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
              }
              .cmap .cm-b text.sub {
                font-size: 16.5px;
                font-weight: 600;
              }
              .cmap .cm-b.cm-dim {
                opacity: 0.48;
              }
              .cmap .cm-b.on {
                opacity: 1;
                filter: url(#vinuni-glow);
              }
              .cmap .cm-b.on > rect:first-child,
              .cmap .cm-b.on > path:first-child {
                fill: url(#vinuni-lit-fill);
                stroke: #7c2d12;
                stroke-width: 5;
              }
              .cmap .cm-b.on .inner {
                fill: #fff7dc;
                stroke: #7c2d12;
                stroke-width: 2.4;
              }
              .cmap .cm-b.on text {
                fill: #171719;
              }
              .cmap .cm-label text {
                fill: #273566;
                font-size: 23px;
                font-weight: 700;
                letter-spacing: 0.8px;
                text-anchor: middle;
                font-family: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
              }
              .cmap .cm-gate {
                fill: #d92d20;
                stroke: #ffffff;
                stroke-width: 3;
              }
            `}</style>
          </defs>

          {/* Redrawn from the VinUni campus map (same 1701x2000 frame). No routes, arrows or event tags. */}
          <rect className="cm-bg" x="0" y="0" width="1701" height="2000" />

          {/* Roads */}
          <g className="cm-road">
            <line x1="268" y1="135" x2="1553" y2="135" />
            <line x1="268" y1="1851" x2="1553" y2="1851" />
            <line x1="183" y1="255" x2="183" y2="1752" />
            <line x1="286" y1="680" x2="286" y2="1377" />
          </g>
          <g className="cm-roadlabel">
            <text x="900" y="96">SAN HO ROAD</text>
            <text x="910" y="1910">HANOI – HAIPHONG EXPRESSWAY</text>
            <text x="0" y="0" transform="translate(154 1000) rotate(-90)">
              52M BOULEVARD
            </text>
          </g>

          {/* Blocks / paths (outlines only) */}
          <g className="cm-line">
            <path d="M355,265 H645 L665,285 V622 L645,642 H286 V335 Z" />
            <path d="M725,265 H1240 L1252,277 V555 L1238,567 H1222 V545 M1125,545 V555 L1110,567 H1068 L1053,552 V440 L1043,432 H1032 V625 L1012,642 H725 L704,621 V286 L725,265" />
            <rect x="712" y="383" width="46" height="150" />
            <rect x="1287" y="265" width="256" height="301" rx="14" />
            <path d="M1060,586 H1145 L1152,595 L1143,640 H1060 L1053,632 Z" />
            <path d="M1180,586 H1250 L1260,600 L1255,640 H1175 L1168,630 Z" />
            <path d="M1283,588 H1533 L1540,596 L1527,857 L1518,865 H1338 L1316,842 Z" />
            <path d="M975,663 H1118 L1131,678 L1090,850 L1073,865 H978 L963,850 V676 Z" />
            <path d="M1162,663 H1258 L1272,678 L1296,848 L1280,865 H1133 L1117,848 L1155,676 Z" />
            <circle cx="1311" cy="873" r="14" />
            <path d="M1108,888 H1296 L1304,898 L1315,1010 L1222,1107 L1198,1110 L1093,935 L1095,905 Z" />
            <path d="M1334,888 H1500 L1510,908 L1425,1066 L1408,1070 L1344,1030 L1325,900 Z" />
            <path d="M1084,960 L1190,1128 L1222,1134 L1315,1050 L1385,1090 L1392,1120 C1300,1260 1220,1360 1170,1410 C1060,1510 960,1720 880,1757 L866,1745 V1677 H727 V1640 H864 V1418 L885,1392 H1010 L1030,1375 Z" />
            <rect x="331" y="679" width="124" height="37" rx="9" />
            <path d="M345,985 H443 L457,999 V1363 L443,1377 H345 L331,1363 V999 Z" />
            <rect x="468" y="800" width="107" height="58" rx="8" />
            <rect x="468" y="873" width="107" height="49" rx="8" />
            <rect x="807" y="830" width="106" height="50" rx="8" />
            <path d="M945,923 H1050 L1063,940 L1018,1365 L1003,1377 H944 L930,1363 V937 Z" />
            <path d="M486,1052 H657 M732,1052 H903 L917,1066 V1363 L903,1377 H877 L862,1363 V1190 C862,1120 800,1081 697,1081 C594,1081 530,1120 530,1190 V1363 L516,1377 H486 L473,1363 V1066 Z" />
            <path d="M556,1150 H573 L584,1160 V1377 H545 V1160 Z" />
            <path d="M820,1150 H837 L848,1160 V1377 H809 V1160 Z" />
            <path d="M300,1395 H510 L527,1412 V1640 H665 V1677 H527 V1697 L505,1713 L300,1635 L286,1617 V1410 Z" />
            <rect x="545" y="1395" width="39" height="135" />
            <rect x="809" y="1392" width="39" height="138" />
            <path d="M545,1540 V1590 C545,1605 560,1615 575,1615 H627 V1600 C600,1595 562,1575 560,1540 Z" />
            <path d="M848,1540 V1590 C848,1605 833,1615 818,1615 H767 V1600 C793,1595 832,1575 834,1540 Z" />
            <path d="M593,1475 H800 V1570 C800,1590 760,1610 737,1610 H655 C632,1610 593,1590 593,1570 Z" />
            <ellipse cx="697" cy="1540" rx="75" ry="50" />
          </g>

          {/* Stadium */}
          <g className="cm-line">
            <rect x="758" y="283" width="188" height="343" rx="94" />
            <rect x="788" y="312" width="128" height="284" rx="64" />
            <line x1="788" y1="376" x2="916" y2="376" />
            <line x1="788" y1="454" x2="916" y2="454" />
            <line x1="788" y1="532" x2="916" y2="532" />
            <circle cx="852" cy="454" r="15" />
            <rect x="821" y="376" width="62" height="30" />
            <rect x="821" y="502" width="62" height="30" />
          </g>

          {/* Parking */}
          <g
            id="b-PARKING"
            className={cn("cm-b cm-park", normalizedActive && "cm-dim")}
          >
            <rect x="331" y="730" width="125" height="238" rx="8" />
            <text x="393" y="840">Parking</text>
            <text x="393" y="868">Lot</text>
          </g>

          {/* Buildings */}
          <g id="b-H" className={buildingClass("H")}>
            <rect x="468" y="678" width="151" height="106" />
            <text x="544" y="738">Building H</text>
          </g>

          <g id="b-G" className={buildingClass("G")}>
            <path d="M636,712 H655 V696 H732 V712 H754 V820 H636 Z" />
            <text x="695" y="768">Building G</text>
          </g>

          <g id="b-B" className={buildingClass("B")}>
            <rect x="776" y="678" width="170" height="137" />
            <text x="861" y="748">Building B</text>
            <text className="sub" x="861" y="772">Auditorium</text>
          </g>

          <g id="b-A" className={buildingClass("A")}>
            <rect x="599" y="820" width="192" height="100" />
            <rect className="inner" x="659" y="880" width="72" height="40" />
            <text x="695" y="860">Building A</text>
            <text className="sub" x="695" y="908">LAB</text>
          </g>

          <g id="b-I" className={buildingClass("I")}>
            <path d="M637,920 H754 V1040 H732 V1072 H658 V1040 H637 Z" />
            <text x="695" y="992">Building I</text>
          </g>

          <g id="b-C" className={buildingClass("C")}>
            <rect x="476" y="937" width="128" height="100" />
            <text x="540" y="994">Building C</text>
          </g>

          <g id="b-D" className={buildingClass("D")}>
            <rect x="348" y="1078" width="92" height="206" rx="6" />
            <text x="394" y="1186">Building D</text>
          </g>

          <g id="b-E" className={buildingClass("E")}>
            <rect x="790" y="942" width="128" height="95" />
            <text x="854" y="990">Building E</text>
            <text className="sub" x="854" y="1014">Canteen</text>
          </g>

          <g id="b-F" className={buildingClass("F")}>
            <rect x="930" y="1052" width="98" height="123" />
            <text x="979" y="1100">Building F</text>
            <text className="sub" x="979" y="1126">Medical</text>
            <text className="sub" x="979" y="1148">Simulation</text>
          </g>

          <g id="b-L" className={buildingClass("L")}>
            <path d="M946,373 H1030 V388 H1003 Q972,455 1003,528 H1030 V543 H946 Z" />
            <text x="0" y="0" transform="translate(962 458) rotate(90)">
              Building L
            </text>
          </g>

          <g id="b-K" className={buildingClass("K")}>
            <rect x="1078" y="373" width="146" height="170" />
            <text x="1151" y="470">Building K</text>
          </g>

          <g id="b-J" className={buildingClass("J")}>
            <path d="M1313,373 H1375 V470 C1375,440 1395,430 1414,430 C1433,430 1455,440 1455,470 V373 H1516 V543 H1313 Z" />
            <text x="1414" y="503">Building J</text>
            <text className="sub" x="1414" y="527">Dorm</text>
          </g>

          <g id="b-P" className={buildingClass("P")}>
            <rect x="1342" y="628" width="156" height="136" rx="4" />
            <text x="1420" y="698">Building P</text>
            <text className="sub" x="1420" y="726">Canteen</text>
          </g>

          {/* Landmarks and gates (neutral markers, no arrows) */}
          <g className="cm-label">
            <text x="697" y="1452">MAIN SQUARE</text>
            <circle className="cm-gate" cx="683" cy="255" r="11" />
            <text x="683" y="222">SAN HO GATE</text>
            <circle className="cm-gate" cx="697" cy="1700" r="11" />
            <text x="697" y="1752">MAIN GATE</text>
          </g>

          {/* Active Room Callout Pill */}
          {activeMeta ? (
            <g
              transform={`translate(${activeMeta.anchorX}, ${Math.max(90, activeMeta.anchorTopY - 34)})`}
              className="animate-pulse motion-reduce:animate-none"
            >
              <rect
                x="-96"
                y="-34"
                width="192"
                height="48"
                rx="24"
                fill="#171719"
                stroke="#FFFEFC"
                strokeWidth="3.5"
              />
              <polygon points="-12,14 12,14 0,28" fill="#171719" />
              <text
                x="0"
                y="-2"
                textAnchor="middle"
                fill="#FFFEFC"
                fontSize="22"
                fontWeight="700"
                fontFamily="var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif"
              >
                {roomCode ? `Phòng ${roomCode}` : `Tòa ${activeMeta.id}`}
              </text>
            </g>
          ) : null}
        </svg>
      </div>

      {/* Compact Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] sm:text-[12px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] ring-2 ring-[#FFE566]"
          />
          {activeMeta
            ? `Đang sáng: ${activeMeta.label}${roomCode ? ` · ${roomCode}` : ""}`
            : "Tòa có ca học sẽ sáng nổi bật"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-[#D8AB58]" />
          Các tòa khác (gồm D & P)
        </span>
      </div>
    </div>
  );
}
