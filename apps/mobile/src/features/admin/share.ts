import { shareCsv } from "@/lib/share-csv";

export async function shareAdminCsv(input: { csv: string; fileName: string }): Promise<void> {
  return shareCsv(input);
}
