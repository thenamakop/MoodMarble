import { Share } from "react-native";

export async function shareCsv(input: { csv: string; fileName: string }): Promise<void> {
  await Share.share({
    title: input.fileName,
    message: input.csv,
  });
}
