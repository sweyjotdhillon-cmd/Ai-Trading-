export const quotaTracker = {
  track: (key: string) => {
    console.log(`Tracking quota for: ${key}`);
  },
  get: (key: string) => {
    console.log(`Getting quota for: ${key}`);
    return 0;
  }
};
