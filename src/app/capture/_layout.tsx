import { Stack } from "expo-router";

export default function CaptureLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_bottom",
        contentStyle: { backgroundColor: "#07090F" },
      }}
    />
  );
}
