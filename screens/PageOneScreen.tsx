import { View, Text, TouchableOpacity } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "PageOne">;
};

export default function PageOneScreen({ navigation }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-gray-900 mb-4">Page One</Text>
      <Text className="text-gray-500 text-base mb-10">
        Content for page one goes here.
      </Text>
      <TouchableOpacity
        className="bg-gray-200 px-6 py-3 rounded-xl"
        onPress={() => navigation.goBack()}
      >
        <Text className="text-gray-700 font-medium">Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
