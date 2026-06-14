import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Text as SvgText,
} from "react-native-svg";

type Props = {
  size?: number;
};

export default function Logo({ size = 80 }: Props) {
  const s = size;
  const c = s / 2;
  const r = s * 0.42;

  // Pointy-top hexagon
  const hex = (i: number) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle) };
  };
  const points = Array.from({ length: 6 }, (_, i) => hex(i));
  const hexPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ") + " Z";

  const innerR = r * 0.62;
  const innerPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return { x: c + innerR * Math.cos(angle), y: c + innerR * Math.sin(angle) };
  });
  const innerPath = innerPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ") + " Z";

  const fontSize = s * 0.36;

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <LinearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6D28D9" />
          <Stop offset="1" stopColor="#DB2777" />
        </LinearGradient>
        <LinearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#F472B6" stopOpacity="0.1" />
        </LinearGradient>
      </Defs>

      {/* Outer glow */}
      <Circle cx={c} cy={c} r={c - 1} fill="url(#grad2)" />

      {/* Main hexagon */}
      <Path d={hexPath} fill="url(#grad1)" />

      {/* Inner hexagon outline */}
      <Path d={innerPath} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={s * 0.012} />

      {/* S letter */}
      <SvgText
        x={c}
        y={c + fontSize * 0.38}
        textAnchor="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
      >
        S
      </SvgText>
    </Svg>
  );
}
