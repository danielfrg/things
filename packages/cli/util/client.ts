import { getConfig } from '../config';
import { client } from '../generated/client.gen';

let initialized = false;

export function initClient() {
  if (initialized) return;
  const config = getConfig();
  client.setConfig({
    baseUrl: config.baseUrl,
    auth: () => config.apiKey,
  });
  initialized = true;
}

export function debugConfig() {
  const config = getConfig();
  return {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'not set',
  };
}
