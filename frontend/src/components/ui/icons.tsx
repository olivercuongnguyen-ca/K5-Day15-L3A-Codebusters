import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function createIcon(
  paths: React.ReactNode,
  defaultViewBox = "0 0 24 24",
) {
  return function VectorIcon({
    size = 20,
    className,
    "aria-hidden": ariaHidden = true,
    ...rest
  }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={defaultViewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
        className={className}
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

export const CalendarIcon = createIcon(
  <>
    <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
    <path d="M3 9.5h18" />
    <path d="M8 2.5v4" />
    <path d="M16 2.5v4" />
  </>,
);

export const ClockIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v4.5l3 1.75" />
  </>,
);

export const VideoIcon = createIcon(
  <>
    <rect x="3" y="6" width="13" height="12" rx="2.5" />
    <path d="m16 10 5-2.5v9L16 14" />
  </>,
);

export const BellIcon = createIcon(
  <>
    <path d="M6.5 9.5a5.5 5.5 0 1 1 11 0c0 4.5 1.8 6 2.5 6.5H4c.7-.5 2.5-2 2.5-6.5Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </>,
);

export const SearchIcon = createIcon(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>,
);

export const CopyIcon = createIcon(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </>,
);

export const CheckIcon = createIcon(<path d="m5 12.5 4.2 4.2L19 7" />);

export const CheckCircleIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.8-4.8" />
  </>,
);

export const AlertCircleIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4.5" />
    <path d="M12 16h.01" />
  </>,
);

export const AlertTriangleIcon = createIcon(
  <>
    <path d="M10.3 4.4 2.9 17.5A1.8 1.8 0 0 0 4.5 20h15a1.8 1.8 0 0 0 1.6-2.5L13.7 4.4a1.9 1.9 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4" />
    <path d="M12 16.5h.01" />
  </>,
);

export const InfoIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </>,
);

export const ChevronRightIcon = createIcon(<path d="m9 6 6 6-6 6" />);

export const ChevronLeftIcon = createIcon(<path d="m15 6-6 6 6 6" />);

export const XIcon = createIcon(
  <>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </>,
);

export const RefreshIcon = createIcon(
  <>
    <path d="M20 11a8 8 0 0 0-14.5-4.5L3 9" />
    <path d="M3 4.5V9h4.5" />
    <path d="M4 13a8 8 0 0 0 14.5 4.5L21 15" />
    <path d="M21 19.5V15h-4.5" />
  </>,
);

export const MailIcon = createIcon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </>,
);

export const SchoolIcon = createIcon(
  <>
    <path d="m2 10 10-5 10 5-10 5-10-5Z" />
    <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    <path d="M22 10v5" />
  </>,
);

export const LinkIcon = createIcon(
  <>
    <path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l2.2-2.2a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3" />
    <path d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-2.2 2.2a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3" />
  </>,
);

export const ExternalLinkIcon = createIcon(
  <>
    <path d="M14 4h6v6" />
    <path d="M10 14 20 4" />
    <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
  </>,
);

export const LockIcon = createIcon(
  <>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>,
);

export const UserIcon = createIcon(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 19.5a7 7 0 0 1 14 0" />
  </>,
);

export const ClipboardIcon = createIcon(
  <>
    <rect x="5" y="4.5" width="14" height="16.5" rx="2.5" />
    <path d="M9 4.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
    <path d="M8.5 10.5h7" />
    <path d="M8.5 14.5h4.5" />
  </>,
);

export const LoaderIcon = createIcon(
  <>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </>,
);

export const TodayIcon = createIcon(
  <>
    <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
    <path d="M3 9.5h18" />
    <path d="M8 2.5v4" />
    <path d="M16 2.5v4" />
    <circle cx="12" cy="15" r="1.75" fill="currentColor" stroke="none" />
  </>,
);

export const SettingsIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z" />
  </>,
);

export const GlobeIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.6 9h16.8" />
    <path d="M3.6 15h16.8" />
    <path d="M12 3a13.5 13.5 0 0 1 0 18" />
    <path d="M12 3a13.5 13.5 0 0 0 0 18" />
  </>,
);

export const CloudOffIcon = createIcon(
  <>
    <path d="M4 4l16 16" />
    <path d="M6.5 18H17a4 4 0 0 0 1-7.87A5.5 5.5 0 0 0 8.2 7.2" />
    <path d="M5.2 10.5A4 4 0 0 0 6.5 18" />
  </>,
);

export const LogOutIcon = createIcon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </>,
);

export const ArrowRightIcon = createIcon(
  <>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </>,
);

export const PlusIcon = createIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const FilterIcon = createIcon(
  <>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </>,
);

export const DownloadIcon = createIcon(
  <>
    <path d="M12 4v11" />
    <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
    <path d="M4.5 19.5h15" />
  </>,
);

export const ShareIcon = createIcon(
  <>
    <path d="M12 3.5v11" />
    <path d="m8 7.5 4-4 4 4" />
    <path d="M5 12v6.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V12" />
  </>,
);

export const SmartphoneIcon = createIcon(
  <>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M11 18h2" />
  </>,
);

export const EyeIcon = createIcon(
  <>
    <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const EyeOffIcon = createIcon(
  <>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.7A10.7 10.7 0 0 1 12 5.5c6.2 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3.2 4" />
    <path d="M6.6 6.6C4 8.5 2 12 2 12s3.8 6.5 10 6.5c1.8 0 3.4-.4 4.8-1.1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
);

export const ShieldIcon = createIcon(
  <>
    <path d="M12 3 4.5 6.2v5.6c0 4.6 3.2 8.4 7.5 9.7 4.3-1.3 7.5-5.1 7.5-9.7V6.2L12 3Z" />
  </>,
);

export const IdCardIcon = createIcon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6.5 15.5a3 3 0 0 1 5 0" />
    <path d="M14.5 10h3.5" />
    <path d="M14.5 13.5h2.5" />
  </>,
);

export const MapPinIcon = createIcon(
  <>
    <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
    <circle cx="12" cy="11" r="2.2" />
  </>,
);

export const CompassIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.3 5.2-5.2 2.3 2.3-5.2 5.2-2.3Z" />
  </>,
);

export const LayersIcon = createIcon(
  <>
    <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
    <path d="m3 12 9 4.5 9-4.5" />
    <path d="m3 16.5 9 4.5 9-4.5" />
  </>,
);

export const NavigationIcon = createIcon(
  <>
    <path d="m3 11 18-8-8 18-2.5-7.5L3 11Z" />
  </>,
);

export const CubeIcon = createIcon(
  <>
    <path d="m12 2.5 8 4.5v10l-8 4.5-8-4.5V7l8-4.5Z" />
    <path d="m12 12 8-5" />
    <path d="M12 12v9.5" />
    <path d="m12 12-8-5" />
  </>,
);

export const BuildingIcon = createIcon(
  <>
    <rect x="4" y="3.5" width="16" height="17.5" rx="2" />
    <path d="M8.5 8h2" />
    <path d="M13.5 8h2" />
    <path d="M8.5 12h2" />
    <path d="M13.5 12h2" />
    <path d="M10 21v-4.5h4V21" />
  </>,
);
