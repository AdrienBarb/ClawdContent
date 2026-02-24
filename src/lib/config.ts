import configData from "../../config.json";

export type ProjectConfig = typeof configData;

export const config: ProjectConfig = configData;

export default config;
