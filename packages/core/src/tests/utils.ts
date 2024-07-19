export const waitFor = async (timeout: number) =>
  await new Promise((resolve) => setTimeout(resolve, timeout))
