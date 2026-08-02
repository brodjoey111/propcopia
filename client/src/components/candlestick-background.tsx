export function CandlestickBackground() {
  return (
    <div className="aurora-shell">
      <div className="aurora-beam aurora-beam-left" />
      <div className="aurora-beam aurora-beam-right" />
      <div className="aurora-grid" />
      <svg
        className="aurora-data"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="aurora-wave" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(18, 58, 188, 0)" />
            <stop offset="18%" stopColor="rgba(56, 189, 248, 0.5)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.85)" />
            <stop offset="82%" stopColor="rgba(34, 211, 238, 0.45)" />
            <stop offset="100%" stopColor="rgba(18, 58, 188, 0)" />
          </linearGradient>
          <linearGradient id="aurora-wave-soft" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(18, 58, 188, 0)" />
            <stop offset="50%" stopColor="rgba(96, 165, 250, 0.45)" />
            <stop offset="100%" stopColor="rgba(18, 58, 188, 0)" />
          </linearGradient>
          <linearGradient id="market-trace" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
            <stop offset="50%" stopColor="rgba(52, 211, 153, 0.82)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
          </linearGradient>
          <linearGradient id="market-trace-red" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(244, 63, 94, 0)" />
            <stop offset="50%" stopColor="rgba(248, 113, 113, 0.7)" />
            <stop offset="100%" stopColor="rgba(244, 63, 94, 0)" />
          </linearGradient>
          <filter id="aurora-blur">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="data-blur">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
        </defs>

        <g filter="url(#aurora-blur)">
          <path
            d="M-120 250 C 120 180, 300 330, 520 250 S 930 130, 1160 220 S 1450 330, 1720 240"
            fill="none"
            stroke="url(#aurora-wave)"
            strokeWidth="90"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-40 0; 30 -18; -40 0"
              dur="20s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M-160 430 C 100 350, 320 500, 540 410 S 920 280, 1160 380 S 1450 520, 1760 420"
            fill="none"
            stroke="url(#aurora-wave-soft)"
            strokeWidth="120"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="35 0; -30 24; 35 0"
              dur="26s"
              repeatCount="indefinite"
            />
          </path>
        </g>
        <g filter="url(#data-blur)" opacity="0.72">
          <path
            d="M-40 720 L 140 690 L 250 705 L 390 642 L 480 655 L 620 590 L 760 618 L 910 560 L 1040 592 L 1180 500 L 1290 525 L 1420 450 L 1560 472"
            fill="none"
            stroke="url(#market-trace)"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <animate
              attributeName="opacity"
              values="0.35;0.82;0.4"
              dur="8s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M1110 760 L 1180 710 L 1230 735 L 1290 662 L 1340 684 L 1400 598 L 1460 642"
            fill="none"
            stroke="url(#market-trace-red)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <animate
              attributeName="opacity"
              values="0.1;0.6;0.12"
              dur="9.5s"
              repeatCount="indefinite"
            />
          </path>
        </g>
        <g opacity="0.45">
          <g fill="rgba(56, 189, 248, 0.82)">
            <rect x="1110" y="410" width="4" height="48" rx="2">
              <animate attributeName="height" values="42;82;42" dur="6s" repeatCount="indefinite" />
              <animate attributeName="y" values="416;376;416" dur="6s" repeatCount="indefinite" />
            </rect>
            <rect x="1142" y="392" width="4" height="76" rx="2">
              <animate attributeName="height" values="56;96;56" dur="7.5s" repeatCount="indefinite" />
              <animate attributeName="y" values="412;372;412" dur="7.5s" repeatCount="indefinite" />
            </rect>
            <rect x="1200" y="430" width="4" height="56" rx="2">
              <animate attributeName="height" values="38;68;38" dur="5.5s" repeatCount="indefinite" />
              <animate attributeName="y" values="448;418;448" dur="5.5s" repeatCount="indefinite" />
            </rect>
          </g>
          <g fill="rgba(248, 113, 113, 0.75)">
            <rect x="1260" y="456" width="4" height="44" rx="2">
              <animate attributeName="height" values="28;64;28" dur="6.8s" repeatCount="indefinite" />
              <animate attributeName="y" values="472;436;472" dur="6.8s" repeatCount="indefinite" />
            </rect>
            <rect x="1324" y="428" width="4" height="68" rx="2">
              <animate attributeName="height" values="34;84;34" dur="8.2s" repeatCount="indefinite" />
              <animate attributeName="y" values="462;412;462" dur="8.2s" repeatCount="indefinite" />
            </rect>
          </g>
        </g>
      </svg>
      <div className="aurora-vignette" />
    </div>
  );
}
