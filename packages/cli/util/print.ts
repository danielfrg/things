import { getConfig } from '../config';

export function printJson(data: unknown) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function print(message: string) {
  process.stdout.write(`${message}\n`);
}

export function printError(message: string) {
  process.stderr.write(`Error: ${message}\n`);
}

export function formatError(error: unknown): string {
  // Get config for debugging info
  let configInfo = '';
  try {
    const config = getConfig();
    configInfo = [
      '',
      '',
      'Debug info:',
      `  Base URL: ${config.baseUrl}`,
      `  API Key: ${config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'not set'}`,
    ].join('\n');
  } catch {
    configInfo = '\n\nDebug info:\n  API Key: not configured';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error + configInfo;
  }

  // Handle object errors
  if (error && typeof error === 'object') {
    // HTTP response error with status
    if ('status' in error && 'statusText' in error) {
      const status = (error as { status: number }).status;
      const statusText = (error as { statusText: string }).statusText;

      const hints: string[] = [];
      if (status === 401) {
        hints.push('  - Your API key may be invalid or expired');
        hints.push('  - Generate a new key in the app settings');
      } else if (status === 404) {
        hints.push('  - The endpoint may not exist');
        hints.push(
          '  - Check that THINGS_API_BASE_URL is correct (should end with /api)',
        );
        hints.push('  - Ensure the server is running');
      } else if (status === 500) {
        hints.push('  - Server error - check server logs');
      }

      return [
        `${status} ${statusText}`,
        ...(hints.length ? ['', 'Possible causes:', ...hints] : []),
        configInfo,
      ].join('\n');
    }

    // Error with message property
    if ('message' in error && typeof error.message === 'string') {
      return error.message + configInfo;
    }

    // Error with error property
    if ('error' in error && typeof error.error === 'string') {
      return error.error + configInfo;
    }

    // Fallback to JSON
    return JSON.stringify(error, null, 2) + configInfo;
  }

  return String(error) + configInfo;
}

export function validateApiResponse(data: unknown, resourceName: string): void {
  if (typeof data === 'string') {
    if (data.includes('<!DOCTYPE html>') || data.includes('<html')) {
      let configInfo = '';
      try {
        const config = getConfig();
        configInfo = [
          `  THINGS_API_BASE_URL=${config.baseUrl}`,
          `  THINGS_API_KEY=${config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'not set'}`,
        ].join('\n');
      } catch {
        configInfo = '  API Key: not configured';
      }

      throw new Error(
        [
          `Received HTML instead of JSON from API. This usually means:`,
          `  1. THINGS_API_BASE_URL is incorrect (should end with /api)`,
          `  2. API key is invalid or expired`,
          ``,
          `Current config:`,
          configInfo,
        ].join('\n'),
      );
    }
  }
  if (data === undefined || data === null) {
    throw new Error(`API returned no data for ${resourceName}`);
  }
}
