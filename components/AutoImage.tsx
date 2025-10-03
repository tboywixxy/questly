import { useEffect, useState } from "react";
import { Image, View } from "react-native";

export default function AutoImage({
  uri,
  className,
  radius = 12,
}: {
  uri: string;
  className?: string;
  radius?: number;
}) {
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => {
        if (mounted && w > 0 && h > 0) setRatio(w / h);
      },
      () => {
        if (mounted) setRatio(1); 
      }
    );
    return () => {
      mounted = false;
    };
  }, [uri]);

  if (!ratio) {
    return <View className={`w-full h-56 bg-gray-200 dark:bg-gray-700 rounded-${radius}`} />;
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: "100%", aspectRatio: ratio, borderRadius: radius }}
      className={className}
      resizeMode="cover"
    />
  );
}
