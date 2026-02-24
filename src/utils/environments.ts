export const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';
export const isStaging = process.env.NEXT_PUBLIC_APP_ENV === 'staging';
export const isDevelopment = process.env.NEXT_PUBLIC_APP_ENV === 'development';

console.log(`Running in ${process.env.NEXT_PUBLIC_APP_ENV} mode.`);

