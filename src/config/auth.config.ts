export const authConfig = {
  secretKey: process.env.JWT_SECRET_KEY as string,
  refreshSecretKey: process.env.JWT_REFRESH_SECRET_KEY as string,
};
