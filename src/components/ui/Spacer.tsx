import { View } from "react-native";

interface Props {
  size?: number;
  horizontal?: boolean;
}

export default function Spacer({ size = 16, horizontal = false }: Props) {
  return <View style={horizontal ? { width: size } : { height: size }} />;
}
