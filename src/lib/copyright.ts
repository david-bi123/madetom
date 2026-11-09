export async function getCopyrightYear(): Promise<number> {
  return new Date().getFullYear();
}
