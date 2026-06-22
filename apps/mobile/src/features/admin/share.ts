import { Share } from "react-native";

export async function shareAdminCsv(input: {
  csv: string;
  fileName: string;
}): Promise<void> {
  await Share.share({
    title: input.fileName,
    message: input.csv,
  });
}
